import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dist = process.argv[2]
  ? pathToFileURL(`${resolve(process.argv[2])}/`)
  : new URL("../dist/", import.meta.url);
const worker = await readFile(
  new URL("./build-offline.worker.js", import.meta.url),
  "utf8",
);
const files = [];
for (const file of await readdir(dist, {
  recursive: true,
  withFileTypes: true,
})) {
  if (file.isFile() && !["_headers", "_redirects", "sw.js"].includes(file.name))
    files.push(
      relative(fileURLToPath(dist), join(file.parentPath, file.name))
        .split("\\")
        .join("/"),
    );
}
files.sort();
const hash = createHash("sha256").update(worker);
const contents = new Map();
for (const name of files) {
  const data = await readFile(new URL(name, dist));
  hash.update(
    JSON.stringify([name, createHash("sha256").update(data).digest("hex")]),
  );
  contents.set(name, data);
}
const version = hash.digest("hex").slice(0, 24);
const html = contents.get("index.html").toString();
if (!html.includes("__QUERYCRAFT_BUILD__"))
  throw new Error("Missing QueryCraft build marker");
const shell = Buffer.from(html.replace("__QUERYCRAFT_BUILD__", version));
await writeFile(new URL("index.html", dist), shell);
contents.set("index.html", shell);
const entries = Array.from(contents, ([name, data]) => ({
  path: name === "index.html" ? "/" : `/${name}`,
  integrity: `sha256-${createHash("sha256").update(data).digest("base64")}`,
}));
await writeFile(
  new URL("sw.js", dist),
  worker
    .replace('"__VERSION__"', JSON.stringify(version))
    .replace('"__ENTRIES__"', JSON.stringify(entries)),
);
console.log(
  `Precached manifest generated for ${entries.length} production files (${version}).`,
);
