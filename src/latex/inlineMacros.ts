/**
 * Extracts `\newcommand`/`\renewcommand` declarations that live in the
 * note body's raw LaTeX blocks (` ```{=latex} ... ``` `), as opposed to the
 * `macros:` frontmatter field.
 *
 * Pandoc already passes these blocks through to the exported `.tex`
 * verbatim; this lets the same declarations also reach Obsidian's live
 * MathJax renderer, so a proof-local helper macro (e.g. `\sumoverannuli`,
 * defined mid-proof and used only there) still renders in preview instead
 * of only working for macros declared once in frontmatter.
 *
 * Deliberately narrow: it pulls out only well-formed `\newcommand{...}{...}`
 * declarations (via the same balanced-brace scan `theoremBlockPreprocessor`
 * doesn't need but this does), not the raw block's full contents — a block
 * that also contains an unrelated `\begin{align}` shouldn't get thrown at
 * MathJax's parser wholesale.
 */

const RAW_LATEX_BLOCK = /```\{=latex\}\n([\s\S]*?)```/g;
const NEWCOMMAND_HEADER = /\\(?:re)?newcommand\*?\s*\{\\[a-zA-Z]+\}\s*(?:\[\d+\])?\s*/g;

export function extractInlineMacros(noteText: string): string {
	const declarations: string[] = [];

	const blockRe = new RegExp(RAW_LATEX_BLOCK);
	let blockMatch: RegExpExecArray | null;
	while ((blockMatch = blockRe.exec(noteText)) !== null) {
		const block = blockMatch[1];

		const headerRe = new RegExp(NEWCOMMAND_HEADER);
		let headerMatch: RegExpExecArray | null;
		while ((headerMatch = headerRe.exec(block)) !== null) {
			const bodyStart = headerRe.lastIndex;
			if (block[bodyStart] !== "{") {
				continue;
			}

			const bodyEnd = matchingBraceIndex(block, bodyStart);
			if (bodyEnd === -1) {
				continue;
			}

			declarations.push(block.slice(headerMatch.index, bodyEnd + 1));
			headerRe.lastIndex = bodyEnd + 1;
		}
	}

	return declarations.join("\n");
}

/** Returns the index of the `}` matching the `{` at `openIndex`, or -1 if unbalanced. */
function matchingBraceIndex(source: string, openIndex: number): number {
	let depth = 0;
	for (let i = openIndex; i < source.length; i++) {
		if (source[i] === "{") {
			depth++;
		} else if (source[i] === "}") {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}
	return -1;
}
