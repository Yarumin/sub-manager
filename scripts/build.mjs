import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(__dirname, "..", "dist", "worker.js");

// dashboardClient.js's payload is a big JS *string* (a template literal)
// that gets shipped to the browser as the panel's client-side script -
// esbuild bundles/transforms real JS statements, but it correctly never
// touches the contents of a string literal (it has no way to know "this
// string happens to contain JS", and it must not rewrite arbitrary string
// data). That means comments and extra whitespace written inside that
// template literal survive untouched all the way into the final worker.js
// bytes, even after the normal comment-stripping pass below. This onLoad
// hook pre-cleans just that one file's template literal (via its own
// esbuild transform pass, with the single `${baseUrl}` interpolation
// swapped for a placeholder token so it survives being parsed as plain JS,
// then restored afterward) before the main bundle ever sees it.
const cleanClientScriptPlugin = {
  name: "clean-client-script-comments",
  setup(build) {
    build.onLoad({ filter: /panel[\\/]dashboardClient\.js$/ }, (args) => {
      const original = fs.readFileSync(args.path, "utf8");
      const match = original.match(/return `([\s\S]*)`;\n}\n?$/);
      if (!match) {
        throw new Error("cleanClientScriptPlugin: could not locate the template literal in " + args.path);
      }
      const PLACEHOLDER = "__SUBMANAGER_BASEURL_PLACEHOLDER__";
      const innerWithPlaceholder = match[1].split("${baseUrl}").join(PLACEHOLDER);
      const cleanedInner = esbuild.transformSync(innerWithPlaceholder, {
        loader: "js",
        legalComments: "none",
        minifyWhitespace: true,
        minifyIdentifiers: false,
        minifySyntax: false,
        target: "es2022"
      }).code;
      const restoredInner = cleanedInner.split(PLACEHOLDER).join("${baseUrl}");
      const patched = original.slice(0, match.index) + "return `" + restoredInner + "`;\n}\n" + original.slice(match.index + match[0].length);
      return { contents: patched, loader: "js" };
    });
  }
};

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
    plugins: [cleanClientScriptPlugin],
    outfile,
    write: false
  });

  const [file] = result.outputFiles;
  fs.writeFileSync(outfile, file.contents);

  // This second pass is the one that removes comments from the worker's own
  // code: esbuild only strips ordinary (non-legal) comments when
  // minifyWhitespace is on - legalComments:"none" alone only controls
  // /*! license */ style comments. minifyIdentifiers/minifySyntax stay off
  // so the bundled worker.js is still debuggable (readable names, no clever
  // rewrites), just comment-free and whitespace-compacted.
  const stripped = esbuild.transformSync(fs.readFileSync(outfile, "utf8"), {
    loader: "js",
    legalComments: "none",
    minifyWhitespace: true,
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
