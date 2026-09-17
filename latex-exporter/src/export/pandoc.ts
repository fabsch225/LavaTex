import { spawn } from "child_process";

import { envWithExtraPath } from "./pathEnv";

export interface PandocJob {
	inputPath: string;
	outputPath: string;
	templatePath: string;
	luaFilterPath: string;
	cwd: string;
}

export interface MarkdownJob {
	inputPath: string;
	outputPath: string;
	cwd: string;
}

function spawnPandoc(args: string[], cwd: string): Promise<void> {
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
	return spawnPandoc(args, job.cwd);
}

/**
 * Runs pandoc straight to markdown -- no LaTeX template or `theorems.lua`
 * (that filter emits raw `\begin{env}...\end{env}` LaTeX blocks, which
 * would defeat the point of a plain-markdown export). Bold-statement blocks
 * stay as the fenced divs `preprocessTheoremBlocks` already produced --
 * pandoc's markdown writer round-trips those natively, so they're still
 * legible without a LaTeX toolchain. Content with no plain-markdown
 * equivalent (align blocks, citations) stays as the raw LaTeX pandoc
 * already wrapped it in; there's no lossless alternative for either.
 */
export function runPandocToMarkdown(job: MarkdownJob): Promise<void> {
	const args = [
		job.inputPath,
		"--from=markdown-latex_macros",
		"--filter",
		"pandoc-crossref",
		"--to=markdown",
		"-o",
		job.outputPath,
	];
	return spawnPandoc(args, job.cwd);
}
