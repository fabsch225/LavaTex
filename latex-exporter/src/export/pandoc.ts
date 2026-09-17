import { spawn } from "child_process";

import { envWithExtraPath } from "./pathEnv";

export interface PandocJob {
	inputPath: string;
	outputPath: string;
	templatePath: string;
	luaFilterPath: string;
	cwd: string;
	/** `--top-level-division` value; "section" for a single note, "chapter" for a book/report-scale project. */
	topLevelDivision?: string;
	/**
	 * Path to a file inserted verbatim (via `--include-in-header`) right
	 * before `\begin{document}` — used for `preamble:`/`macros:` content.
	 * Deliberately *not* passed through the `$preamble$`/`$macros$` template
	 * variables: pandoc's YAML metadata values are markdown-parsed like any
	 * other content, and pandoc's raw-LaTeX passthrough only recognizes a
	 * curated set of common macros (`\usepackage`, `\newcommand`, ...) — an
	 * unrecognized one (`\newtheoremstyle`, a multi-line `\lstdefinestyle`,
	 * ...) falls back to literal text and gets escaped for the LaTeX writer,
	 * silently corrupting the preamble. `--include-in-header` inserts the
	 * file's bytes unparsed, sidestepping that entirely.
	 */
	headerIncludesPath?: string;
	/** Path to a file inserted verbatim (via `--include-after-body`) right before `\end{document}` — used for `bibliography-raw:` content, for the same reason. */
	afterBodyPath?: string;
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
		`--top-level-division=${job.topLevelDivision ?? "section"}`,
		"-o",
		job.outputPath,
	];

	if (job.headerIncludesPath) {
		args.push(`--include-in-header=${job.headerIncludesPath}`);
	}
	if (job.afterBodyPath) {
		args.push(`--include-after-body=${job.afterBodyPath}`);
	}

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
