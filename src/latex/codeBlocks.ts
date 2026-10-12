/**
 * Turns a fenced code block (` ```python ... ``` `, ` ```r ... ``` `, any
 * language tag except `tikz`, which `tikzBlocks.ts` already owns) into a
 * raw `lstlisting` environment for the exported `.tex`, the same shape as
 * `tikzBlocks.ts`.
 *
 * Pandoc's own fenced-code handling goes through skylighting, which needs
 * its own preamble macros and doesn't match `listings`-based styling (line
 * numbers, a project's `\lstset{style=...}`) that a note's `preamble:`
 * already sets up with the `listings` package. Since `\lstset` applies
 * globally, the emitted environment carries no `[language=...]` option of
 * its own, and the fence's language tag is otherwise discarded — it's
 * there for the note author's own reading/editor-highlighting benefit, not
 * passed through to `listings`. The note's `preamble:` (or a shared macros
 * note) decides the actual language once, via `\lstset{style=...}` or
 * `\lstset{language=...}` — so use whatever tag honestly describes the
 * code (` ```python `, ` ```r `, ...), it doesn't change the output.
 *
 * Requires `\usepackage{listings}` (and a `\lstset{...}`) in the note's
 * `preamble:` — not added automatically, since not every project needs it.
 */
const CODE_BLOCK = /^```(?!tikz\b)([A-Za-z][\w+-]*)[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm;

export function convertCodeBlocksToRaw(text: string): string {
	return text.replace(CODE_BLOCK, (_match, _lang: string, body: string) => {
		return "```{=latex}\n\\begin{lstlisting}\n" + body + "\n\\end{lstlisting}\n```";
	});
}
