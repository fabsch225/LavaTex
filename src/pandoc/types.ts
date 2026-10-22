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

/**
 * The markdown flavor every pandoc call reads notes as.
 *
 * - `-latex_macros`: pandoc's reader otherwise pre-expands any \newcommand
 *   it sees (including ones from `macros:`) inside math, before the LaTeX
 *   writer ever runs. Disabling this keeps macro calls literal, so the
 *   emitted .tex's own \newcommand does the expansion instead.
 * - `+lists_without_preceding_blankline`: Obsidian starts a list right
 *   after a paragraph line; pandoc's markdown otherwise needs a blank line
 *   first and folds the items into the paragraph as literal "- " text.
 * - `+mark`: Obsidian's `==highlight==` syntax, written as soul's `\hl{}`.
 */
export const PANDOC_MARKDOWN_FORMAT = "markdown-latex_macros+lists_without_preceding_blankline+mark";

export interface PandocInput {
	/** Preprocessed markdown, ready for pandoc's `PANDOC_MARKDOWN_FORMAT` reader. */
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
