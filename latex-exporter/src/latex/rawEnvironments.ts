/**
 * Wraps bare `\begin{align}...\end{align}` (and `align*`) blocks in a
 * ` ```{=latex} ``` ` raw block before handing the note to pandoc.
 *
 * Written bare (no `$$`/raw-block fence) in the note itself, MathJax's TeX
 * input processor recognizes and renders `align` directly — it auto-detects
 * AMS environments (`processEnvironments`, on by default), no `$` delimiters
 * needed. That's what makes it render live in Obsidian.
 *
 * Pandoc's markdown reader has no such auto-detection: outside math or a
 * raw block, a bare `\begin{align}` is just paragraph text, and pandoc's
 * LaTeX writer escapes backslashes in paragraph text — the exported `.tex`
 * would come out corrupted. So this wraps the same bare block in a raw
 * LaTeX fence right before pandoc sees it, without touching the note file
 * itself: two different consumers of one source line, each getting the
 * form they need.
 */
const ALIGN_BLOCK = /^(\\begin\{align\*?\}[\s\S]*?\\end\{align\*?\})$/gm;

export function wrapBareAlignEnvironments(text: string): string {
	return text.replace(ALIGN_BLOCK, (block) => "```{=latex}\n" + block + "\n```");
}
