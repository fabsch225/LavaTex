/**
 * Turns a ` ```tikz ... ``` ` fenced block — the same plain syntax the
 * community obsidian-tikzjax plugin renders live in the editor via
 * TikZJax — into raw LaTeX for the exported `.tex`, optionally wrapped in a
 * numbered `figure` environment.
 *
 * Kept as its own pass (rather than teaching pandoc about a "tikz" code
 * block) because pandoc has no such concept; the block is already valid
 * LaTeX (a `\begin{tikzpicture}...\end{tikzpicture}`), so the only job here
 * is handing it to pandoc as an untouched raw block instead of a fenced code
 * block it would otherwise typeset verbatim as text.
 *
 * A plain block passes through as-is:
 *
 *   ```tikz
 *   \begin{tikzpicture}
 *   \draw (0,0) -- (1,1);
 *   \end{tikzpicture}
 *   ```
 *
 * A `Figure:` line immediately after the closing fence promotes it to a
 * captioned, labelled figure — mirroring the bold-statement header syntax
 * (`(title)` then `{#label}`) rather than inventing a third syntax:
 *
 *   ```tikz
 *   \begin{tikzpicture}
 *   \draw (0,0) -- (1,1);
 *   \end{tikzpicture}
 *   ```
 *   Figure: A commutative diagram. {#fig:comm}
 *
 * Requires `\usepackage{tikz}` (and any `\usetikzlibrary{...}`) in the
 * note's `preamble:` frontmatter — not added automatically, since not every
 * project uses TikZ.
 */
const TIKZ_BLOCK =
	/^```tikz[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n[ \t]*Figure:[ \t]*(.*))?/gm;

export function convertTikzBlocksToRaw(text: string): string {
	return text.replace(TIKZ_BLOCK, (_match, body: string, figureLine?: string) => {
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
