/**
 * Minimal ambient shape of the `pandoc-wasm` package's public API — just
 * enough for `./wasm.ts` to type-check `import("pandoc-wasm")` without
 * actually depending on the real package at build time. `pandoc-wasm` ships
 * a ~60MB WASM binary, so it is never a `dependency`/`devDependency` of this
 * package: it's opt-in, installed by whoever imports `lavatex-core/wasm`.
 */
declare module "pandoc-wasm" {
	export interface PandocConvertResult {
		stdout: string;
		stderr: string;
		warnings: unknown[];
		files: Record<string, string | Blob>;
		mediaFiles: Record<string, string | Blob>;
	}

	export function convert(
		options: Record<string, unknown>,
		stdin: string | null,
		files: Record<string, string | Blob>,
	): Promise<PandocConvertResult>;
}
