import { registerRootComponent } from "expo";
import { isProductionWorkerBuild } from "./src/runtime/environment";

void (isProductionWorkerBuild() ? import("./src/ProductionApp") : import("./App")).then(
  ({ default: App }) => registerRootComponent(App)
);
