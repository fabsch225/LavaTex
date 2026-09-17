/**
 * Cleanup passes for the plain-markdown export, applied to the note body
 * after citations are resolved. Each strips syntax that only means
 * something to this plugin's own pipeline, so what's left reads as
 * ordinary markdown wherever it ends up (GitHub, another note, a chat
 * message, ...) rather than a pandoc round-trip's fenced divs and raw
 * `{=latex}` passthrough noise.
 */

const ENVIRONMENT_END_MARK_LINE = /^∎[ \t]*\n?/gm;

/** Removes the "∎" bold-statement-block terminator — meaningless outside this plugin's own preprocessing. */
export function stripEnvironmentEndMarks(text: string): string {
	return text.replace(ENVIRONMENT_END_MARK_LINE, "");
}

const RAW_LATEX_BLOCK = /```\{=latex\}\n([\s\S]*?)```\n?/g;
const RAW_LATEX_INLINE = /`([^`\n]+)`\{=latex\}/g;

/**
 * Unwraps pandoc's raw-LaTeX-passthrough syntax to bare text. There's no
 * plain-markdown equivalent for the LaTeX itself (a local `\newcommand`, a
 * `\qed`), but the backtick/fence wrapper is still just noise once nothing
 * downstream is going to interpret the `{=latex}` tag.
 */
export function unwrapRawLatexSpans(text: string): string {
	return text
		.replace(RAW_LATEX_BLOCK, (_match, content: string) => content.trimEnd() + "\n")
		.replace(RAW_LATEX_INLINE, "$1");
}

/** Collapses runs of 3+ newlines (left behind by the removals above) down to a single blank line. */
export function collapseBlankLines(text: string): string {
	return text.replace(/\n{3,}/g, "\n\n");
}
