// Lets node --test load the app's own modules: "@/x" is src/x, and imports inside src/ leave
// off the file extension the way the bundler allows.
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), "../src");

function withExtension(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolvePath(base, "index.ts")]) {
    if (existsSync(candidate) && !candidate.endsWith(SRC)) {
      if (candidate === base && !/\.[cm]?[jt]sx?$/.test(base)) continue;
      return candidate;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let target = null;
  if (specifier.startsWith("@/")) {
    target = withExtension(resolvePath(SRC, specifier.slice(2)));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    if (parent.startsWith(SRC)) target = withExtension(resolvePath(dirname(parent), specifier));
  }
  if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  return nextResolve(specifier, context);
}
