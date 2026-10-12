/**
 * Turns a `$$ \begin{align}...\end{align} $$` block into a
 * ` ```{=latex} ``` ` raw block (dropping the `$$`) before handing the note
 * to pandoc.
 *
 * MathJax does *not* auto-detect AMS environments outside math delimiters —
 * `\begin{align}` written bare in the note is just plain text to Obsidian's
 * live renderer. Like any other display equation it needs `$$` around it to
 * render live, even though `align` is already its own display environment.
 *
 * Pandoc's markdown reader would instead treat that `$$...$$` as ordinary
 * display math and hand its contents to the LaTeX math writer, which cannot
 * emit `\begin{align}` (align isn't valid nested inside another math
 * environment) — the exported `.tex` would come out broken. So this strips
 * the `$$` and wraps the bare environment in a raw LaTeX fence right before
 * pandoc sees it, without touching the note file itself: two different
 * consumers of one source block, each getting the form they need.
 */
const ALIGN_BLOCK =
	/^\$\$[ \t]*\r?\n(\\begin\{align\*?\}[\s\S]*?\\end\{align\*?\})\r?\n\$\$[ \t]*$/gm;

export function convertAlignBlocksToRaw(text: string): string {
	return text.replace(ALIGN_BLOCK, (_match, env: string) => "```{=latex}\n" + env + "\n```");
}
