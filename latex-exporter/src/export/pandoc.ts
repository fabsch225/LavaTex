import { spawn } from "child_process";

import { envWithExtraPath } from "./pathEnv";

export interface PandocJob {
	inputPath: string;
	outputPath: string;
	templatePath: string;
	luaFilterPath: string;
	cwd: string;
}

/** Runs pandoc with the flags this plugin always needs, rejecting with stderr on failure. */
export function runPandoc(job: PandocJob): Promise<void> {
	const args = [
		job.inputPath,
		// Pandoc's markdown reader otherwise pre-expands any \newcommand it
		// sees (including ones from the `macros:` frontmatter field) inside
		// math, before the LaTeX writer ever runs. Disabling this keeps macro
		// calls literal, so the emitted .tex's own \newcommand does the
		// expansion, as intended.
		"--from=markdown-latex_macros",
		"--template",
		job.templatePath,
		"--lua-filter",
		job.luaFilterPath,
		"--filter",
		"pandoc-crossref",
		"--top-level-division=section",
		"-o",
		job.outputPath,
	];

	return new Promise((resolve, reject) => {
		const proc = spawn("pandoc", args, { cwd: job.cwd, env: envWithExtraPath() });

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
