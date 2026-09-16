import esbuild from "esbuild";
import process from "node:process";

const production = process.argv[2] === "production";

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: ["obsidian", "electron", "child_process", "path", "os"],
	format: "cjs",
	platform: "node",
	target: "es2020",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	minify: production,
	outfile: "main.js",
});

if (production) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
