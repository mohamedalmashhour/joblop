import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = process.cwd();

type AppSurface = {
  appDir: string;
  name: string;
};

const appSurfaces: AppSurface[] = [
  { appDir: join(workspaceRoot, "apps/employer/app"), name: "employer" },
  { appDir: join(workspaceRoot, "apps/admin/app"), name: "admin" }
];

const mobileSourceDir = join(workspaceRoot, "apps/mobile");

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (entry === ".next" || entry === "node_modules" || entry === "api") {
      return [];
    }
    if (statSync(fullPath).isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return /\.(tsx|ts)$/.test(entry) ? [fullPath] : [];
  });
}

function routeFromPage(appDir: string, filePath: string) {
  const routePath = relative(appDir, filePath);
  if (!routePath.endsWith("page.tsx")) {
    return null;
  }

  const route = `/${dirname(routePath)
    .split(sep)
    .filter((part) => part !== ".")
    .join("/")}`;

  return route === "/" ? "/" : route;
}

function pageForRoute(appDir: string, route: string) {
  const cleanRoute = route === "/" ? "" : route.slice(1);
  return join(appDir, cleanRoute, "page.tsx");
}

function normalizeRoute(route: string) {
  return route !== "/" && route.endsWith("/") ? route.slice(0, -1) : route;
}

function isColorHex(value: string) {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value);
}

function isPredicateLiteral(source: string, matchIndex = 0) {
  return /startsWith\(\s*$/.test(source.slice(Math.max(0, matchIndex - 24), matchIndex));
}

function idsInPage(filePath: string) {
  if (!existsSync(filePath)) {
    return new Set<string>();
  }

  const source = readFileSync(filePath, "utf8");
  return new Set([...source.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map((match) => match[1]));
}

function routeSetFor(appDir: string) {
  return new Set(listSourceFiles(appDir).map((filePath) => routeFromPage(appDir, filePath)).filter(Boolean));
}

function listApiRoutePatterns(appDir: string) {
  const apiDir = join(appDir, "api");
  if (!existsSync(apiDir)) return [];
  const visit = (directory: string): string[] =>
    readdirSync(directory).flatMap((entry) => {
      const fullPath = join(directory, entry);
      if (statSync(fullPath).isDirectory()) return visit(fullPath);
      if (entry !== "route.ts") return [];
      const relativeRoute = relative(appDir, dirname(fullPath)).split(sep).join("/");
      return [`/${relativeRoute}`];
    });
  return visit(apiDir);
}

function matchesRoutePattern(route: string, pattern: string) {
  const routeSegments = route.split("/");
  const patternSegments = pattern.split("/");
  return routeSegments.length === patternSegments.length &&
    routeSegments.every((segment, index) => {
      const expected = patternSegments[index] ?? "";
      return /^\[.+\]$/u.test(expected) || segment === expected;
    });
}

function validateInternalRouteReference({
  appDir,
  routeReference,
  sourceFile
}: {
  appDir: string;
  routeReference: string;
  sourceFile: string;
}) {
  if (
    routeReference.startsWith("http") ||
    routeReference.startsWith("mailto:") ||
    routeReference.startsWith("tel:")
  ) {
    return null;
  }

  const routes = routeSetFor(appDir);

  if (routeReference.startsWith("#")) {
    if (isColorHex(routeReference)) {
      return null;
    }

    if (idsInPage(sourceFile).has(routeReference.slice(1))) {
      return null;
    }

    const sourceRoute = routeFromPage(appDir, sourceFile) ?? "/";
    const sourcePage = pageForRoute(appDir, sourceRoute);
    return idsInPage(sourcePage).has(routeReference.slice(1))
      ? null
      : `${relative(workspaceRoot, sourceFile)} points to missing same-page anchor ${routeReference}`;
  }

  if (!routeReference.startsWith("/")) {
    return null;
  }

  const [routeWithQuery, anchor] = routeReference.split("#");
  const route = routeWithQuery?.split("?")[0] ?? "/";
  const routePath = normalizeRoute(route.replaceAll(/\$\{[^}]+\}/gu, "__dynamic__") || "/");
  const isApiRoute = routePath.startsWith("/api/") &&
    listApiRoutePatterns(appDir).some((pattern) => matchesRoutePattern(routePath, pattern));
  if (!routes.has(routePath) && !isApiRoute) {
    return `${relative(workspaceRoot, sourceFile)} points to missing route ${routeReference}`;
  }

  if (anchor && !idsInPage(pageForRoute(appDir, routePath)).has(anchor)) {
    return `${relative(workspaceRoot, sourceFile)} points to missing anchor ${routeReference}`;
  }

  return null;
}

describe("implemented page navigation integrity", () => {
  it("keeps employer and admin static links pointed at implemented routes or real anchors", () => {
    const failures = appSurfaces.flatMap(({ appDir }) =>
      listSourceFiles(appDir).flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return [...source.matchAll(/href\s*=\s*"([^"]+)"/g)]
          .map((match) =>
            validateInternalRouteReference({
              appDir,
              routeReference: match[1],
              sourceFile: filePath
            })
          )
          .filter(Boolean);
      })
    );

    expect(failures).toEqual([]);
  });

  it("keeps route fields pointed at implemented employer and admin pages", () => {
    const failures = appSurfaces.flatMap(({ appDir }) =>
      listSourceFiles(appDir).flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return [...source.matchAll(/route:\s*"([^"]+)"/g)]
          .map((match) =>
            validateInternalRouteReference({
              appDir,
              routeReference: match[1],
              sourceFile: filePath
            })
          )
          .filter(Boolean);
      })
    );

    expect(failures).toEqual([]);
  });

  it("keeps all internal route-like source literals pointed at implemented pages or anchors", () => {
    const failures = appSurfaces.flatMap(({ appDir }) =>
      listSourceFiles(appDir).flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return [...source.matchAll(/["'`]((?:\/|#)[^"'`]+)["'`]/g)]
          .filter((match) => !isPredicateLiteral(source, match.index))
          .map((match) =>
            validateInternalRouteReference({
              appDir,
              routeReference: match[1],
              sourceFile: filePath
            })
          )
          .filter(Boolean);
      })
    );

    expect(failures).toEqual([]);
  });

  it("keeps every non-link button either locally active or explicitly disabled", () => {
    const inertButtons = appSurfaces.flatMap(({ appDir }) =>
      listSourceFiles(appDir).flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return [...source.matchAll(/<button\b([\s\S]*?)>([\s\S]*?)<\/button>/g)]
          .map((match) => ({
            attrs: match[1],
            file: relative(workspaceRoot, filePath)
          }))
          .filter((button) => !/onClick=/.test(button.attrs) && !/\bdisabled\b/.test(button.attrs));
      })
    );

    expect(inertButtons).toEqual([]);
  });

  it("keeps mobile pressable controls either locally active or explicitly disabled", () => {
    const inertPressables = listSourceFiles(mobileSourceDir).flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return [...source.matchAll(/<Pressable\b([\s\S]*?)(?:\/>|>)/g)]
        .map((match) => ({
          attrs: match[1],
          file: relative(workspaceRoot, filePath)
        }))
        .filter((pressable) => !/onPress=/.test(pressable.attrs) && !/\bdisabled\b/.test(pressable.attrs));
    });

    expect(inertPressables).toEqual([]);
  });
});
