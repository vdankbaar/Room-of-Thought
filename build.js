const esbuild = require('esbuild');
const chokidar = require('chokidar');

let watchDir = 'src/**/*';

build();
console.log(`Watching '${watchDir}'!`);
const watcher = chokidar.watch('./src/*', {persistent: true, awaitWriteFinish: true});
watcher.on('change', build);

function build() {
    esbuild.build({
        entryPoints: ["src/map.ts"],
        outdir: "client",
        bundle: true,
        minify: true,
        sourcemap: true,
        loader: {".ts": "ts"},
    })
    .then(() => console.log("Map.js done!"))
    .catch((err) => {console.error(err); process.exit(1);});
    
    esbuild.build({
        entryPoints: ["src/index.ts"],
        outdir: "client",
        sourcemap: true,
        bundle: true,
        minify: true,
        loader: {".ts": "ts"}
    })
    .then(() => console.log("Index.js done!"))
    .catch((err) => {console.error(err); process.exit(1);});
}