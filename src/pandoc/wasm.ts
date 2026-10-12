/**
 * Runs pandoc entirely in-process via WebAssembly (the `pandoc-wasm` package
 * — the same library https://github.com/synyx/pandoc-web bundles into its
 * browser build), so no `pandoc` binary needs to be installed on the host
 * machine. Trade-off: `pandoc-crossref` is a separate Haskell binary pandoc
 * itself shells out to, which has no WASM build, so cross-reference
 * resolution (`[@eq:label]` etc.) does not run under this backend — only
 * under `nativePandocBackend()`.
 *
 * Kept out of the package's main entry point on purpose: `pandoc-wasm` ships
 * a ~60MB `pandoc.wasm` binary, so importing it is opt-in (`import
 * "lavatex-core/wasm"`) rather than a cost every consumer pays, including
 * ones that only ever use `exportNoteToMarkdown` or the native backend.
 */
import type { PandocBackend, PandocInput } from "./types";

async function loadPandocWasm(): Promise<typeof import("pandoc-wasm")> {
	try {
		return await import("pandoc-wasm");
	} catch {
		throw new Error(
			'The WASM pandoc backend requires the optional "pandoc-wasm" dependency. Install it with `npm install pandoc-wasm`.',
		);
	}
}

export function wasmPandocBackend(): PandocBackend {
	return {
		async convert(input: PandocInput): Promise<string> {
			const { convert } = await loadPandocWasm();

			const files: Record<string, string> = {
				"template.latex": input.template,
				"filter.lua": input.luaFilter,
			};
			const options: Record<string, unknown> = {
				from: "markdown-latex_macros",
				to: "latex",
				template: "template.latex",
				"lua-filter": "filter.lua",
				"top-level-division": input.topLevelDivision ?? "section",
			};
			if (input.headerIncludes) {
				files["header-includes.tex"] = input.headerIncludes;
				options["include-in-header"] = "header-includes.tex";
			}
			if (input.afterBody) {
				files["after-body.tex"] = input.afterBody;
				options["include-after-body"] = "after-body.tex";
			}

			const result = await convert(options, input.markdown, files);
			return String(result.stdout);
		},
	};
}
