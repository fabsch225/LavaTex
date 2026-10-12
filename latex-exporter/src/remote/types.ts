import type { LatexEngine, PandocInput } from "lavatex-core";

/** One remote export: pandoc (+ pandoc-crossref), then optionally latexmk. */
export interface RemoteJob {
	pandoc: Omit<PandocInput, "cwd">;
	/** Also compile the resulting .tex to PDF. */
	compile: boolean;
	engine: LatexEngine;
	/** Files the document includes (images, ...), keyed by the path it references them by. */
	files: Record<string, ArrayBuffer>;
}

export interface RemoteResult {
	tex: string;
	pdf?: ArrayBuffer;
}

/** A user-owned remote pandoc + LaTeX toolchain (GitHub Actions or Cloud Run). */
export interface RemoteToolchain {
	run(job: RemoteJob, onProgress: (message: string) => void): Promise<RemoteResult>;
	/** Verifies the configuration end to end, returning a one-line summary. */
	check(): Promise<string>;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}
