import { createConnection, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";
import type { ConsumeInput, ConsumeResult, LimiterStore } from "./store";

const consumeScript = `
local account = redis.call("INCR", KEYS[1])
if account == 1 then redis.call("EXPIRE", KEYS[1], ARGV[3]) end
local network = redis.call("INCR", KEYS[2])
if network == 1 then redis.call("EXPIRE", KEYS[2], ARGV[3]) end
local accountTtl = redis.call("TTL", KEYS[1])
local networkTtl = redis.call("TTL", KEYS[2])
if accountTtl < 0 or networkTtl < 0 then return redis.error_reply("unsafe ttl") end
local allowed = 0
if account <= tonumber(ARGV[1]) and network <= tonumber(ARGV[2]) then allowed = 1 end
return {allowed, accountTtl, networkTtl}
`.trim();

export class RedisLimiterStore implements LimiterStore {
  readonly #client: RedisProtocolClient;
  readonly #readinessKey: string;

  constructor(redisUrl: string, namespace: string) {
    this.#client = new RedisProtocolClient(redisUrl);
    this.#readinessKey = `${namespace}:readiness`;
  }

  async consume(input: ConsumeInput): Promise<ConsumeResult> {
    const response = await this.#client.command([
      "EVAL",
      consumeScript,
      "2",
      input.accountKey,
      input.networkKey,
      String(input.accountMaximum),
      String(input.networkMaximum),
      String(input.windowSeconds)
    ]);
    return parseLimiterRedisResponse(response, input.windowSeconds);
  }

  async ready() {
    try {
      const response = await this.#client.command([
        "EVAL",
        'redis.call("SET", KEYS[1], "1", "EX", "2"); local ttl = redis.call("TTL", KEYS[1]); redis.call("DEL", KEYS[1]); return ttl',
        "1",
        this.#readinessKey
      ]);
      return typeof response === "number" && response > 0;
    } catch {
      return false;
    }
  }

  async resetNamespace(prefix: string) {
    let cursor = "0";
    let removed = 0;
    do {
      const response = await this.#client.command([
        "SCAN",
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        "100"
      ]);
      if (
        !Array.isArray(response) ||
        response.length !== 2 ||
        typeof response[0] !== "string" ||
        !Array.isArray(response[1]) ||
        !response[1].every((key) => typeof key === "string")
      ) {
        throw new Error("RWOS_LIMITER_REDIS_SCAN_INVALID");
      }
      cursor = response[0];
      const keys = response[1] as string[];
      if (keys.length) {
        const count = await this.#client.command(["DEL", ...keys]);
        if (typeof count !== "number") throw new Error("RWOS_LIMITER_REDIS_DELETE_INVALID");
        removed += count;
      }
    } while (cursor !== "0");
    return removed;
  }

  async close() {}
}

export function parseLimiterRedisResponse(
  response: unknown,
  windowSeconds: number
): ConsumeResult {
  if (
    !Array.isArray(response) ||
    response.length !== 3 ||
    !response.every((value) => Number.isInteger(value)) ||
    (response[0] !== 0 && response[0] !== 1) ||
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1 ||
    (response[1] as number) < 1 ||
    (response[2] as number) < 1 ||
    (response[1] as number) > windowSeconds ||
    (response[2] as number) > windowSeconds
  ) {
    throw new Error("RWOS_LIMITER_REDIS_RESPONSE_INVALID");
  }
  return {
    allowed: response[0] === 1,
    retryAfterSeconds: Math.max(response[1] as number, response[2] as number)
  };
}

type RedisValue = string | number | null | RedisValue[];

class RedisProtocolClient {
  readonly #url: URL;
  readonly #timeoutMs = 1000;

  constructor(redisUrl: string) {
    this.#url = new URL(redisUrl);
  }

  async command(command: string[]): Promise<RedisValue> {
    const commands: string[][] = [];
    if (this.#url.password) {
      commands.push(
        this.#url.username
          ? ["AUTH", decodeURIComponent(this.#url.username), decodeURIComponent(this.#url.password)]
          : ["AUTH", decodeURIComponent(this.#url.password)]
      );
    }
    const database = this.#url.pathname.replace("/", "");
    if (database && database !== "0") commands.push(["SELECT", database]);
    commands.push(command);
    const responses = await this.#exchange(commands);
    return responses.at(-1) ?? null;
  }

  async #exchange(commands: string[][]) {
    const socket = await this.#connect();
    return new Promise<RedisValue[]>((resolve, reject) => {
      let buffer = Buffer.alloc(0);
      const responses: RedisValue[] = [];
      const timeout = setTimeout(
        () => finish(new Error("RWOS_LIMITER_REDIS_TIMEOUT")),
        this.#timeoutMs
      );

      const finish = (error?: Error) => {
        clearTimeout(timeout);
        socket.removeAllListeners();
        socket.destroy();
        if (error) reject(error);
        else resolve(responses);
      };

      socket.on("error", (error) => finish(error));
      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        try {
          while (responses.length < commands.length) {
            const parsed = parseRedisValue(buffer, 0);
            if (!parsed) break;
            responses.push(parsed.value);
            buffer = buffer.subarray(parsed.offset);
          }
          if (responses.length === commands.length) finish();
        } catch (error) {
          finish(error instanceof Error ? error : new Error("RWOS_LIMITER_REDIS_INVALID"));
        }
      });
      socket.write(commands.map(encodeCommand).join(""));
    });
  }

  async #connect(): Promise<Socket | TLSSocket> {
    const port = Number(this.#url.port || "6379");
    const host = this.#url.hostname;
    return new Promise((resolve, reject) => {
      const secure = this.#url.protocol === "rediss:";
      const socket = secure
        ? connectTls({ host, port, servername: host })
        : createConnection({ host, port });
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("RWOS_LIMITER_REDIS_CONNECT_TIMEOUT"));
      }, this.#timeoutMs);
      socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      socket.once(secure ? "secureConnect" : "connect", () => {
        clearTimeout(timeout);
        resolve(socket);
      });
    });
  }
}

function encodeCommand(command: string[]) {
  return `*${command.length}\r\n${command
    .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
    .join("")}`;
}

function parseRedisValue(
  buffer: Buffer,
  offset: number
): { value: RedisValue; offset: number } | null {
  if (offset >= buffer.length) return null;
  const type = String.fromCharCode(buffer[offset]!);
  const line = readLine(buffer, offset + 1);
  if (!line) return null;
  if (type === "+") return { value: line.value, offset: line.offset };
  if (type === "-") throw new Error("RWOS_LIMITER_REDIS_COMMAND_FAILED");
  if (type === ":") return { value: Number(line.value), offset: line.offset };
  if (type === "$") {
    const length = Number(line.value);
    if (length === -1) return { value: null, offset: line.offset };
    const end = line.offset + length;
    if (buffer.length < end + 2) return null;
    return { value: buffer.subarray(line.offset, end).toString("utf8"), offset: end + 2 };
  }
  if (type === "*") {
    const length = Number(line.value);
    if (length === -1) return { value: null, offset: line.offset };
    const values: RedisValue[] = [];
    let next = line.offset;
    for (let index = 0; index < length; index += 1) {
      const parsed = parseRedisValue(buffer, next);
      if (!parsed) return null;
      values.push(parsed.value);
      next = parsed.offset;
    }
    return { value: values, offset: next };
  }
  throw new Error("RWOS_LIMITER_REDIS_PROTOCOL_INVALID");
}

function readLine(buffer: Buffer, offset: number) {
  const end = buffer.indexOf("\r\n", offset);
  return end === -1
    ? null
    : { value: buffer.subarray(offset, end).toString("utf8"), offset: end + 2 };
}
