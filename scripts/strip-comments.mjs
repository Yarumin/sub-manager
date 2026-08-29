import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('usage: node strip-comments.js <in.js> <out.js>');
  process.exit(1);
}

const source = fs.readFileSync(inputPath, 'utf8');

const result = esbuild.transformSync(source, {
  loader: 'js',
  legalComments: 'none',
  minifyWhitespace: false,
  minifyIdentifiers: false,
  minifySyntax: false,
  target: 'es2022',
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, result.code);
