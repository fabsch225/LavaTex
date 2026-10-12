/**
 * Turns a ` ```tikz ... ``` ` fenced block — the same plain syntax the
 * community obsidian-tikzjax plugin renders live in the editor via
 * TikZJax — into raw LaTeX for the exported `.tex`, optionally wrapped in a
 * numbered `figure` environment.
 *
 * Kept as its own pass (rather than teaching pandoc about a "tikz" code
 * block) because pandoc has no such concept; the block is already valid
 * LaTeX (a `\begin{tikzpicture}...\end{tikzpicture}`, or a `tikz-cd`/
 * `circuitikz`/... environment from one of the other packages TikZJax
 * bundles), so the only job here is handing it to pandoc as an untouched
 * raw block instead of a fenced code block it would otherwise typeset
 * verbatim as text.
 *
 * TikZJax itself compiles each block as its own standalone document — its
 * README requires `\usepackage{...}` for anything beyond plain `tikz`, a
 * `\begin{document}...\end{document}` wrapper around the content, and (same
 * as regular LaTeX, just not called out by the README) `\usetikzlibrary{...}`
 * for anything beyond TikZ's default libraries, e.g.:
 *
 *   ```tikz
 *   \usepackage{tikz-cd}
 *   \begin{document}
 *   \usetikzlibrary{arrows.meta}
 *   \begin{tikzcd}
 *   A \arrow{r}{f} & B
 *   \end{tikzcd}
 *   \end{document}
 *   ```
 *
 * That wrapper is meaningless (and invalid) spliced into the middle of the
 * exported document's own body, so it's stripped before the block becomes a
 * raw block — leaving just `\begin{tikzcd}...\end{tikzcd}`. The `\usepackage`
 * and `\usetikzlibrary` lines are *not* carried over automatically: the same
 * package/library needs to also be declared in the note's own `preamble:`,
 * exactly like plain `\usepackage{tikz}` already does, so one block works
 * both live in the editor (via TikZJax) and in the exported document (via
 * the real LaTeX preamble) without silently depending on this pass to wire
 * the two together.
 *
 * TikZJax's README wraps `\begin{document}...\end{document}` around every
 * example, plain `tikzpicture` included — the wrapper isn't specific to
 * packages like `tikz-cd`. A block with no such wrapper (because it's meant
 * only for the exported `.tex`, not live-rendered in the editor) passes
 * through as-is.
 *
 * A `Figure:` line immediately after the closing fence promotes it to a
 * captioned, labelled figure — mirroring the bold-statement header syntax
 * (`(title)` then `{#label}`) rather than inventing a third syntax:
 *
 *   ```tikz
 *   \begin{document}
 *   \begin{tikzpicture}
 *   \draw (0,0) -- (1,1);
 *   \end{tikzpicture}
 *   \end{document}
 *   ```
 *   Figure: A commutative diagram. {#fig:comm}
 */
const TIKZ_BLOCK =
	/^```tikz[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n[ \t]*Figure:[ \t]*(.*))?/gm;
const PREAMBLE_LINE =
	/^[ \t]*\\(?:usepackage|usetikzlibrary)(?:\[[^\]]*\])?\{[^}]*\}[ \t]*\r?\n/;
const DOCUMENT_WRAPPER = /^[ \t]*\\begin\{document\}[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\\end\{document\}[ \t]*$/;

/** Strips TikZJax's standalone-document shell (leading `\usepackage{...}`/`\usetikzlibrary{...}` lines, `\begin{document}...\end{document}`), keeping just the diagram itself. */
function stripTikzjaxWrapper(body: string): string {
	let text = body;
	while (PREAMBLE_LINE.test(text)) {
		text = text.replace(PREAMBLE_LINE, "");
	}
	const docMatch = DOCUMENT_WRAPPER.exec(text.trim());
	if (docMatch) {
		let inner = docMatch[1];
		while (PREAMBLE_LINE.test(inner)) {
			inner = inner.replace(PREAMBLE_LINE, "");
		}
		return inner;
	}
	return text;
}

export function convertTikzBlocksToRaw(text: string): string {
	return text.replace(TIKZ_BLOCK, (_match, rawBody: string, figureLine?: string) => {
		const body = stripTikzjaxWrapper(rawBody);
		if (!figureLine) {
			return "```{=latex}\n" + body + "\n```";
		}

		let rest = figureLine.trim();
		let label = "";
		const labelMatch = /\{#([\w:-]+)\}[ \t]*$/.exec(rest);
		if (labelMatch) {
			label = labelMatch[1];
			rest = rest.slice(0, labelMatch.index).trim();
		}

		const lines = ["\\begin{figure}[htbp]", "\\centering", body, `\\caption{${rest}}`];
		if (label) lines.push(`\\label{${label}}`);
		lines.push("\\end{figure}");

		return "```{=latex}\n" + lines.join("\n") + "\n```";
	});
}
