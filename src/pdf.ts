import { envWithExtraPath } from "./pathEnv";
import { nodeRequire } from "./nodeRequire";

/**
 * - `latexmk`: pdfLaTeX from a full local TeX distribution (MacTeX/TeX Live).
 * - `tectonic`: a single self-contained XeTeX-based binary that downloads
 *   only the packages a document uses, on first use, and caches them —
 *   no TeX distribution install. Needs network the first time a package
 *   is used; reruns for cross-references on its own.
 */
export type LatexEngine = "latexmk" | "tectonic";

export interface CompileJob {
	texPath: string;
	cwd: string;
	/** Defaults to `latexmk`. */
	engine?: LatexEngine;
}

const INSTALL_HINTS: Record<LatexEngine, string> = {
	latexmk:
		"Could not find the `latexmk` executable. Install a LaTeX distribution (e.g. MacTeX/TeX Live) and make sure it's on your PATH.",
	tectonic: "Could not find the `tectonic` executable. Install it (e.g. `brew install tectonic`) and make sure it's on your PATH.",
};

/** Compiles a .tex file to PDF via latexmk or tectonic, rejecting with its log tail on failure. */
export function compileToPdf(job: CompileJob): Promise<string> {
	const { spawn } = nodeRequire<typeof import("child_process")>("child_process");
	const path = nodeRequire<typeof import("path")>("path");
	const engine = job.engine ?? "latexmk";
	const outDir = path.dirname(job.texPath);
	const args =
		engine === "tectonic"
			? ["--outdir", outDir, job.texPath]
			: ["-pdf", "-interaction=nonstopmode", "-halt-on-error", `-output-directory=${outDir}`, job.texPath];

	return new Promise((resolve, reject) => {
		const proc = spawn(engine, args, { cwd: job.cwd, env: envWithExtraPath() });

		let stdout = "";
		proc.stdout.on("data", (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		proc.stderr.on("data", (chunk: Buffer) => {
			stdout += chunk.toString();
		});

		proc.on("error", (err) => {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				reject(new Error(INSTALL_HINTS[engine]));
			} else {
				reject(err);
			}
		});
		proc.on("close", (code) => {
			if (code === 0) {
				resolve(job.texPath.replace(/\.tex$/, ".pdf"));
			} else {
				const tail = stdout.trim().split("\n").slice(-40).join("\n");
				reject(new Error(tail || `${engine} exited with code ${code}`));
			}
		});
	});
}

/** Opens a file in the OS default application, throwing if that fails. */
export function openInDefaultApp(filePath: string): Promise<void> {
	const { spawn } = nodeRequire<typeof import("child_process")>("child_process");
	const path = nodeRequire<typeof import("path")>("path");
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
