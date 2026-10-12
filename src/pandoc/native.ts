/**
 * Shells out to a real `pandoc` + `pandoc-crossref` install on `PATH`. This
 * is the default backend: it has no extra install-time cost (no bundled
 * WASM binary), at the cost of requiring `pandoc`/`pandoc-crossref` to
 * already be on the machine (`brew install pandoc pandoc-crossref`, or
 * equivalent).
 */
import { nodeRequire } from "../nodeRequire";
import { envWithExtraPath } from "../pathEnv";
import type { PandocBackend, PandocInput } from "./types";

async function writeTemp(tag: string, ext: string, content: string): Promise<string> {
	const fs = nodeRequire<typeof import("fs/promises")>("fs/promises");
	const os = nodeRequire<typeof import("os")>("os");
	const path = nodeRequire<typeof import("path")>("path");
	const filePath = path.join(os.tmpdir(), `lavatex-${tag}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
	await fs.writeFile(filePath, content, "utf8");
	return filePath;
}

function runPandoc(args: string[], cwd: string): Promise<void> {
	const { spawn } = nodeRequire<typeof import("child_process")>("child_process");
	return new Promise((resolve, reject) => {
		const proc = spawn("pandoc", args, { cwd, env: envWithExtraPath() });

		let stderr = "";
		proc.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		proc.on("error", (err) => {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				reject(
					new Error(
						"Could not find the `pandoc` executable. Install it (e.g. `brew install pandoc`) and make sure it's on your PATH.",
					),
				);
			} else {
				reject(err);
			}
		});
		proc.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(stderr.trim() || `pandoc exited with code ${code}`));
			}
		});
	});
}

export function nativePandocBackend(): PandocBackend {
	return {
		async convert(input: PandocInput): Promise<string> {
			const fs = nodeRequire<typeof import("fs/promises")>("fs/promises");
			const os = nodeRequire<typeof import("os")>("os");
			const path = nodeRequire<typeof import("path")>("path");
			const tmpFiles: string[] = [];
			try {
				const inputPath = await writeTemp("input", "md", input.markdown);
				tmpFiles.push(inputPath);
				const templatePath = await writeTemp("template", "latex", input.template);
				tmpFiles.push(templatePath);
				const luaFilterPath = await writeTemp("filter", "lua", input.luaFilter);
				tmpFiles.push(luaFilterPath);
				const outputPath = path.join(os.tmpdir(), `lavatex-output-${process.pid}-${Date.now()}.tex`);
				tmpFiles.push(outputPath);

				let headerIncludesPath: string | undefined;
				if (input.headerIncludes) {
					headerIncludesPath = await writeTemp("header", "tex", input.headerIncludes);
					tmpFiles.push(headerIncludesPath);
				}
				let afterBodyPath: string | undefined;
				if (input.afterBody) {
					afterBodyPath = await writeTemp("afterbody", "tex", input.afterBody);
					tmpFiles.push(afterBodyPath);
				}

				const args = [
					inputPath,
					// Pandoc's markdown reader otherwise pre-expands any \newcommand
					// it sees (including ones from `macros:`) inside math, before the
					// LaTeX writer ever runs. Disabling this keeps macro calls literal,
					// so the emitted .tex's own \newcommand does the expansion instead.
					"--from=markdown-latex_macros",
					"--template",
					templatePath,
					"--lua-filter",
					luaFilterPath,
					"--filter",
					"pandoc-crossref",
					`--top-level-division=${input.topLevelDivision ?? "section"}`,
					"-o",
					outputPath,
				];
				if (headerIncludesPath) args.push(`--include-in-header=${headerIncludesPath}`);
				if (afterBodyPath) args.push(`--include-after-body=${afterBodyPath}`);

				await runPandoc(args, input.cwd ?? process.cwd());
				return await fs.readFile(outputPath, "utf8");
			} finally {
				await Promise.all(tmpFiles.map((file) => fs.rm(file, { force: true })));
			}
		},
	};
}
