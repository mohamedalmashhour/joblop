import { buildApi } from "./app";
import { getRuntimeConfig } from "@rwos/config";

const app = buildApi();
const config = getRuntimeConfig();

await app.listen({ host: "0.0.0.0", port: config.apiPort });
