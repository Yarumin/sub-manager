import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(__dirname, "..", "dist", "worker.js");

// Runs a piece of JS text through esbuild on its own to strip its comments,
// swapping any `${...}` template interpolations for placeholder tokens
// first so the text still parses as plain JS, then restoring them
// afterward. Used below for every chunk of JS embedded as a *string*
// inside another file's template literal - esbuild's normal bundling pass
// never looks inside string contents (it has no way to know "this string
// happens to contain JS", and must not rewrite arbitrary string data), so
// without this, comments/whitespace written inside such strings would
// survive untouched all the way into the final worker.js bytes.
function cleanEmbeddedJs(jsText) {
  const interpolations = [];
  const withPlaceholders = jsText.replace(/\$\{[^}]*\}/g, (match) => {
    interpolations.push(match);
    return `__SUBMANAGER_INTERP_${interpolations.length - 1}__`;
  });
  const cleaned = esbuild.transformSync(withPlaceholders, {
    loader: "js",
    legalComments: "none",
    minifyWhitespace: true,
    minifyIdentifiers: false,
    minifySyntax: false,
    target: "es2022"
  }).code;
  return cleaned.replace(/__SUBMANAGER_INTERP_(\d+)__/g, (_, i) => interpolations[Number(i)]);
}

// dashboardClient.js's payload is a big JS *string* (a template literal)
// that gets shipped to the browser as the panel's client-side script - see
// cleanEmbeddedJs() above for why this needs its own pass.
const cleanClientScriptPlugin = {
  name: "clean-client-script-comments",
  setup(build) {
    build.onLoad({ filter: /panel[\\/]dashboardClient\.js$/ }, (args) => {
      const original = fs.readFileSync(args.path, "utf8");
      const match = original.match(/return `([\s\S]*)`;\n}\n?$/);
      if (!match) {
        throw new Error("cleanClientScriptPlugin: could not locate the template literal in " + args.path);
      }
      const cleanedInner = cleanEmbeddedJs(match[1]);
      const patched = original.slice(0, match.index) + "return `" + cleanedInner + "`;\n}\n" + original.slice(match.index + match[0].length);
      return { contents: patched, loader: "js" };
    });
  }
};

// dashboardShell.js's payload is an HTML *string* with its own inline
// <script> block (the language-detection snippet that runs before first
// paint) - same problem as above, just one level up: that <script> block's
// contents are JS text sitting inside dashboardShell.js's own template
// literal, so they need the same per-embedding cleanup pass. Every
// <script>...</script> block found is cleaned independently and generically
// (not hardcoded to one specific snippet), so this keeps working if more
// inline scripts are ever added to the shell.
const cleanShellInlineScriptsPlugin = {
  name: "clean-shell-inline-script-comments",
  setup(build) {
    build.onLoad({ filter: /panel[\\/]dashboardShell\.js$/ }, (args) => {
      const original = fs.readFileSync(args.path, "utf8");
      const scriptBlockPattern = /(<script>)([\s\S]*?)(<\/script>)/g;
      let patched = original;
      let match;
      const replacements = [];
      while ((match = scriptBlockPattern.exec(original)) !== null) {
        const inner = match[2];
        // Skip the one <script> tag whose body is a template interpolation
        // (the embedded client script itself, `${getDashboardClientScript(...)}`)
        // rather than literal JS text - that one is cleaned separately by
        // cleanClientScriptPlugin above, inside dashboardClient.js itself.
        if (/^\s*\$\{[\s\S]*\}\s*$/.test(inner)) continue;
        replacements.push({ full: match[0], cleaned: match[1] + cleanEmbeddedJs(inner) + match[3] });
      }
      replacements.forEach(({ full, cleaned }) => {
        patched = patched.replace(full, cleaned);
      });
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
    plugins: [cleanClientScriptPlugin, cleanShellInlineScriptsPlugin],
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
