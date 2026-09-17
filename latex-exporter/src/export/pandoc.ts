import { spawn } from "child_process";

export interface PandocJob {
	inputPath: string;
	outputPath: string;
	templatePath: string;
	luaFilterPath: string;
	cwd: string;
}

// GUI apps on macOS (and often Linux) are launched from Finder/Dock rather
// than a login shell, so they don't inherit the PATH set up in .zshrc/.bashrc
// (e.g. Homebrew's /opt/homebrew/bin). Without these, `spawn("pandoc", ...)`
// fails with ENOENT even though `pandoc` works fine in a terminal.
const EXTRA_PATH_ENTRIES = [
	"/opt/homebrew/bin",
	"/usr/local/bin",
	"/usr/bin",
	"/bin",
];

function buildEnv(): NodeJS.ProcessEnv {
	const existing = process.env.PATH ?? "";
	const entries = existing.split(":").filter(Boolean);
	for (const dir of EXTRA_PATH_ENTRIES) {
		if (!entries.includes(dir)) {
			entries.push(dir);
		}
	}
	return { ...process.env, PATH: entries.join(":") };
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
		const proc = spawn("pandoc", args, { cwd: job.cwd, env: buildEnv() });

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
