/**
 * A `PandocBackend` turns preprocessed pandoc-flavored markdown into LaTeX.
 * Two implementations ship with this package:
 *
 * - `nativePandocBackend()` (`./native`, always available) shells out to a
 *   real `pandoc` + `pandoc-crossref` install on `PATH`.
 * - `wasmPandocBackend()` (`lavatex-core/wasm`, a separate entry point so
 *   the ~60MB `pandoc-wasm` dependency is never pulled in unless you
 *   actually import it) runs pandoc entirely in-process via WebAssembly —
 *   no external binaries required, at the cost of `pandoc-crossref`
 *   cross-reference support (a separate Haskell binary pandoc itself shells
 *   out to, which has no WASM equivalent).
 */

export interface PandocInput {
	/** Preprocessed markdown, ready for pandoc's `markdown-latex_macros` reader. */
	markdown: string;
	/** Contents of the LaTeX template (`--template`). */
	template: string;
	/** Contents of the Lua filter applied before the LaTeX writer runs (`--lua-filter`). */
	luaFilter: string;
	/** `--top-level-division` value; `"section"` for a single note, `"chapter"` for a book/report-scale project. */
	topLevelDivision?: string;
	/** Inserted verbatim right before `\begin{document}` (`--include-in-header`) — `preamble:`/`macros:` content. */
	headerIncludes?: string;
	/** Inserted verbatim right before `\end{document}` (`--include-after-body`) — `bibliography-raw:` content. */
	afterBody?: string;
	/** Working directory pandoc resolves relative resource paths (images, ...) against. Native backend only; ignored by the WASM backend, which has no real filesystem. */
	cwd?: string;
}

export interface PandocBackend {
	/** Converts `input` to a complete `.tex` document. */
	convert(input: PandocInput): Promise<string>;
}
