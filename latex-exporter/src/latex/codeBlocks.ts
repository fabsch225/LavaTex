/**
 * Turns a ` ```r ... ``` ` fenced code block into a raw `lstlisting`
 * environment for the exported `.tex`, the same shape as `tikzBlocks.ts`.
 *
 * Pandoc's own fenced-code handling goes through skylighting, which needs
 * its own preamble macros and doesn't match `listings`-based styling (line
 * numbers, a project's `\lstset{style=...}`) that a note's `preamble:`
 * already sets up with the `listings` package. Since `\lstset` applies
 * globally, the emitted environment carries no `[language=...]` option of
 * its own — the note's `preamble:` (or a shared macros note) decides that
 * once, via `\lstset{style=...}` or `\lstset{language=...}`.
 *
 * Requires `\usepackage{listings}` (and a `\lstset{...}`) in the note's
 * `preamble:` — not added automatically, since not every project needs it.
 */
const CODE_BLOCK = /^```r[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm;

export function convertCodeBlocksToRaw(text: string): string {
	return text.replace(CODE_BLOCK, (_match, body: string) => {
		return "```{=latex}\n\\begin{lstlisting}\n" + body + "\n\\end{lstlisting}\n```";
	});
}
