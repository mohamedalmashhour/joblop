import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ControlClassification =
  | "working"
  | "intentionally_disabled"
  | "governed"
  | "deferred";

type Control = Readonly<{
  app: "employer" | "admin" | "worker";
  file: string;
  line: number;
  tag: string;
  label: string;
  destination: string | null;
  classification: ControlClassification;
  evidence: string;
}>;

type AppName = Control["app"];

const root = process.cwd();
const appRoots = [
  { app: "employer" as const, path: join(root, "apps", "employer") },
  { app: "admin" as const, path: join(root, "apps", "admin") },
  { app: "worker" as const, path: join(root, "apps", "mobile") }
];

export async function buildControlInventory() {
  const routePatterns = await discoverRoutePatterns();
  const controls: Control[] = [];
  const defects: string[] = [];
  for (const target of appRoots) {
    for (const file of await files(target.path)) {
      if (!/\.(?:tsx|jsx)$/u.test(file) || /\.(?:test|spec)\./u.test(file)) continue;
      const source = await readFile(file, "utf8");
      const pattern =
        /<(button|a|Link|input|select|textarea|Pressable|TextInput|Switch)\b([^>]*?)(?:\/>|>)/gsu;
      for (const match of source.matchAll(pattern)) {
        const tag = match[1]!;
        const attributes = match[2] ?? "";
        const offset = match.index ?? 0;
        const line = source.slice(0, offset).split("\n").length;
        const label = attribute(attributes, "aria-label") ?? nearbyLabel(source, offset, match[0].length);
        const destination = attribute(attributes, "href");
        const result = classify(
          tag,
          attributes,
          destination,
          routePatterns[target.app]
        );
        const item: Control = {
          app: target.app,
          file: relative(root, file),
          line,
          tag,
          label,
          destination,
          classification: result.classification,
          evidence: result.evidence
        };
        controls.push(item);
        if (result.defect) defects.push(`${item.file}:${line} ${result.defect}`);
      }
    }
  }
  controls.sort((left, right) =>
    left.file.localeCompare(right.file) || left.line - right.line || left.tag.localeCompare(right.tag)
  );
  const counts = Object.fromEntries(
    (["working", "intentionally_disabled", "governed", "deferred"] as const).map((status) => [
      status,
      controls.filter((control) => control.classification === status).length
    ])
  );
  return {
    schemaVersion: 1,
    scope: ["employer", "admin", "worker"],
    counts,
    controls,
    defects
  };
}

async function main() {
  const inventory = await buildControlInventory();
  const outputFlag = process.argv.indexOf("--output");
  if (outputFlag >= 0) {
    const requested = process.argv[outputFlag + 1];
    if (!requested) throw new Error("--output requires a repository-relative JSON path.");
    const output = resolve(root, requested);
    if (!output.startsWith(`${root}/`)) throw new Error("Control inventory output must stay in the repository.");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  } else {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  }
  if (inventory.defects.length) {
    throw new Error(`RWOS_CONTROL_INVENTORY_DEFECTS:${inventory.defects.length}`);
  }
}

function classify(
  tag: string,
  attributes: string,
  destination: string | null,
  routePatterns: readonly RegExp[]
): { classification: ControlClassification; evidence: string; defect?: string } {
  if (tag === "button" || tag === "Pressable") {
    const handler = tag === "button" ? "onClick" : "onPress";
    if (/\bonClick\s*=/u.test(attributes) || /\btype\s*=\s*["']submit["']/u.test(attributes)) {
      return { classification: "working", evidence: "event_or_form_submission" };
    }
    if (tag === "Pressable" && /\bonPress\s*=/u.test(attributes)) {
      return { classification: "working", evidence: "event_handler" };
    }
    if (/\bdisabled(?:\s|=|$)/u.test(attributes) || /\baria-disabled\s*=\s*["']true["']/u.test(attributes)) {
      return { classification: "intentionally_disabled", evidence: "explicit_disabled_state" };
    }
    return {
      classification: "deferred",
      evidence: "no_event_submission_or_disabled_state",
      defect: `${tag} is interactive-looking but has no ${handler} handler, submit behavior, or disabled state`
    };
  }
  if (tag === "a" || tag === "Link") {
    if (!destination) {
      if (/\bhref\s*=\s*\{/u.test(attributes)) {
        return { classification: "governed", evidence: "runtime_destination" };
      }
      return {
        classification: "deferred",
        evidence: "missing_destination",
        defect: "link has no inspectable destination"
      };
    }
    if (/^(?:https?:|mailto:|tel:|#)/u.test(destination)) {
      return { classification: "working", evidence: "external_or_page_anchor_destination" };
    }
    const path = destination.split(/[?#]/u, 1)[0] || "/";
    if (routePatterns.some((pattern) => pattern.test(path))) {
      return { classification: "working", evidence: "implemented_application_route" };
    }
    return {
      classification: "deferred",
      evidence: "missing_application_route",
      defect: `destination ${destination} does not match an implemented route`
    };
  }
  if (
    /\bdisabled(?:\s|=|$)/u.test(attributes) ||
    /\baria-disabled\s*=\s*["']true["']/u.test(attributes) ||
    /\breadOnly(?:\s|=|$)/u.test(attributes) ||
    /\beditable\s*=\s*\{\s*false\s*\}/u.test(attributes)
  ) {
    return { classification: "intentionally_disabled", evidence: "explicit_disabled_state" };
  }
  if (
    (tag === "TextInput" && /\bonChangeText\s*=/u.test(attributes)) ||
    (tag === "Switch" && /\bonValueChange\s*=/u.test(attributes)) ||
    (tag === "input" && /\bonChange\s*=/u.test(attributes)) ||
    ((tag === "select" || tag === "textarea") && /\bonChange\s*=/u.test(attributes))
  ) {
    return { classification: "working", evidence: "event_handler" };
  }
  return { classification: "working", evidence: "enabled_form_control" };
}

async function discoverRoutePatterns() {
  const patterns: Record<AppName, RegExp[]> = {
    employer: [],
    admin: [],
    worker: []
  };
  for (const target of appRoots.filter((entry) => entry.app !== "worker")) {
    const appDirectory = join(target.path, "app");
    for (const file of await files(appDirectory)) {
      if (!file.endsWith("/page.tsx")) continue;
      const route = relative(appDirectory, dirname(file))
        .split("/")
        .filter((segment) => !segment.startsWith("("))
        .map((segment) =>
          segment.startsWith("[") && segment.endsWith("]") ? "[^/]+" : escapeRegex(segment)
        )
        .join("/");
      patterns[target.app].push(new RegExp(`^/${route}/?$`, "u"));
    }
    patterns[target.app].sort((left, right) => left.source.localeCompare(right.source));
  }
  return patterns;
}

async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function attribute(attributes: string, name: string) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "u"));
  return match?.[1] ?? null;
}

function nearbyLabel(source: string, offset: number, openingLength: number) {
  const tail = source.slice(offset + openingLength, offset + openingLength + 180);
  return tail
    .replace(/<[^>]+>/gu, " ")
    .replace(/\{[^}]*\}/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 100);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
