import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(__dirname, "..", "dist", "worker.js");

async function build() {
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  const result = await esbuild.build({
    entryPoints: [path.join(__dirname, "..", "src", "index.js")],
    bundle: true,
    format: "esm",
    target: "es2022",
    platform: "browser",
    legalComments: "none",
    minifyWhitespace: false,
    minifyIdentifiers: false,
    minifySyntax: false,
    outfile,
    write: false
  });

  const [file] = result.outputFiles;
  fs.writeFileSync(outfile, file.contents);

  const stripped = esbuild.transformSync(fs.readFileSync(outfile, "utf8"), {
    loader: "js",
    legalComments: "none",
    minifyWhitespace: false,
    minifyIdentifiers: false,
    minifySyntax: false,
    target: "es2022"
  });

  const finalCode = stripped.code.split("/* @__PURE__ */ ").join("");

  fs.writeFileSync(outfile, finalCode);

  console.log("Built:", outfile, "(" + Buffer.byteLength(finalCode, "utf8") + " bytes)");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
