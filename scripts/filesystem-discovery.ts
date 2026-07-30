import { lstatSync, readdirSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export interface FileDiscoveryOptions {
  readonly repositoryRoot: string;
  readonly roots: readonly string[];
  readonly excludedDirectoryNames?: ReadonlySet<string>;
  readonly requireFiles?: boolean;
  readonly label: string;
}

export function discoverFiles(options: FileDiscoveryOptions) {
  const repositoryRoot = resolve(options.repositoryRoot);
  const files: string[] = [];

  for (const configuredRoot of [...options.roots].sort(compareNames)) {
    const root = approvedRoot(repositoryRoot, configuredRoot, options.label);
    const rootStat = readStat(root.absolute, options.label, root.relative);
    if (rootStat.isSymbolicLink()) {
      throw discoveryError(options.label, root.relative, "root is a symbolic link");
    }
    if (!rootStat.isDirectory()) {
      throw discoveryError(options.label, root.relative, "root is not a directory");
    }

    const filesBeforeRoot = files.length;
    visitDirectory(repositoryRoot, root.absolute, options, files);
    if (options.requireFiles && files.length === filesBeforeRoot) {
      throw discoveryError(options.label, root.relative, "existing root contains no files");
    }
  }

  return files.sort(compareNames);
}

function visitDirectory(
  repositoryRoot: string,
  directory: string,
  options: FileDiscoveryOptions,
  files: string[]
) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      compareNames(left.name, right.name)
    );
  } catch (error) {
    throw discoveryError(
      options.label,
      repositoryRelative(repositoryRoot, directory),
      `directory cannot be read: ${errorCode(error)}`
    );
  }

  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    const relativePath = repositoryRelative(repositoryRoot, absolute);
    const stat = readStat(absolute, options.label, relativePath);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      if (!options.excludedDirectoryNames?.has(entry.name)) {
        visitDirectory(repositoryRoot, absolute, options, files);
      }
      continue;
    }
    if (!stat.isFile()) {
      throw discoveryError(options.label, relativePath, "unsupported filesystem entry");
    }
    files.push(relativePath);
  }
}

function approvedRoot(repositoryRoot: string, configuredRoot: string, label: string) {
  if (!configuredRoot || isAbsolute(configuredRoot)) {
    throw discoveryError(label, configuredRoot || "<empty>", "root must be repository-relative");
  }
  const absolute = resolve(repositoryRoot, configuredRoot);
  const relativePath = repositoryRelative(repositoryRoot, absolute);
  if (relativePath === "." || relativePath.startsWith("../") || isAbsolute(relativePath)) {
    throw discoveryError(label, configuredRoot, "root escapes the repository");
  }
  return { absolute, relative: relativePath };
}

function repositoryRelative(repositoryRoot: string, absolute: string) {
  return relative(repositoryRoot, absolute).split(sep).join("/");
}

function readStat(absolute: string, label: string, relativePath: string) {
  try {
    return lstatSync(absolute);
  } catch (error) {
    throw discoveryError(
      label,
      relativePath,
      `filesystem entry cannot be read: ${errorCode(error)}`
    );
  }
}

function errorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "UNKNOWN";
}

function discoveryError(label: string, path: string, reason: string) {
  return new Error(`PUBLIC_BUNDLE_FILE_DISCOVERY_FAILED [${label}] ${path}: ${reason}`);
}

function compareNames(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}
