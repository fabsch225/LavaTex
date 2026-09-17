import { spawn } from "child_process";
import * as path from "path";

import { envWithExtraPath } from "./pathEnv";

export interface CompileJob {
	texPath: string;
	cwd: string;
}

/** Compiles a .tex file to PDF via latexmk, rejecting with its log tail on failure. */
export function compileToPdf(job: CompileJob): Promise<string> {
	const outDir = path.dirname(job.texPath);
	const args = [
		"-pdf",
		"-interaction=nonstopmode",
		"-halt-on-error",
		`-output-directory=${outDir}`,
		job.texPath,
	];

	return new Promise((resolve, reject) => {
		const proc = spawn("latexmk", args, { cwd: job.cwd, env: envWithExtraPath() });

		let stdout = "";
		proc.stdout.on("data", (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		proc.stderr.on("data", (chunk: Buffer) => {
			stdout += chunk.toString();
		});

		proc.on("error", (err) => {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				reject(
					new Error(
						"Could not find the `latexmk` executable. Install a LaTeX distribution (e.g. MacTeX/TeX Live) and make sure it's on your PATH.",
					),
				);
			} else {
				reject(err);
			}
		});
		proc.on("close", (code) => {
			if (code === 0) {
				resolve(job.texPath.replace(/\.tex$/, ".pdf"));
			} else {
				const tail = stdout.trim().split("\n").slice(-40).join("\n");
				reject(new Error(tail || `latexmk exited with code ${code}`));
			}
		});
	});
}

/** Opens a file in the OS default application, throwing if that fails. */
export function openInDefaultApp(filePath: string): Promise<void> {
	// `start` is a cmd.exe builtin, not its own executable, hence the `cmd /c`
	// wrapper. The empty `""` is a required placeholder for `start`'s window
	// title arg, without which a path containing spaces gets misread as one.
	const [command, args] =
		process.platform === "win32"
			? ["cmd", ["/c", "start", "", filePath]]
			: process.platform === "darwin"
				? ["open", [filePath]]
				: ["xdg-open", [filePath]];

	return new Promise((resolve, reject) => {
		const proc = spawn(command, args, { env: envWithExtraPath() });

		proc.on("error", (err) => reject(err));
		proc.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Could not open ${path.basename(filePath)} (exit code ${code})`));
			}
		});
	});
}
