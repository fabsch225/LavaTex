import { describe, expect, it } from "vitest";

import { collectTikzPreamble, convertTikzBlocksToRaw } from "../src/latex/tikzBlocks";

const CD_BLOCK = "```tikz\n\\usepackage{tikz-cd}\n\\usepackage{amssymb}\n\\begin{document}\n\\usetikzlibrary{arrows.meta}\n\\begin{tikzcd} A \\arrow[r] & B \\end{tikzcd}\n\\end{document}\n```";

describe("collectTikzPreamble", () => {
	it("hoists tikz plus every block's \\usepackage/\\usetikzlibrary lines, deduplicated", () => {
		expect(collectTikzPreamble(`${CD_BLOCK}\n\ntext\n\n${CD_BLOCK}`)).toEqual([
			"\\usepackage{tikz}",
			"\\usepackage{tikz-cd}",
			"\\usepackage{amssymb}",
			"\\usetikzlibrary{arrows.meta}",
		]);
	});

	it("adds nothing for a note without tikz blocks", () => {
		expect(collectTikzPreamble("```python\nimport tikz\n```")).toEqual([]);
	});
});

describe("convertTikzBlocksToRaw", () => {
	it("strips the TikZJax wrapper and centers a diagram without a Figure: line", () => {
		expect(convertTikzBlocksToRaw(CD_BLOCK)).toBe(
			"```{=latex}\n\\begin{center}\n\\begin{tikzcd} A \\arrow[r] & B \\end{tikzcd}\n\\end{center}\n```",
		);
	});

	it("strips a wrapper whose \\usepackage lines are separated by blank lines", () => {
		const block = "```tikz\n\\usepackage{tikz-cd}\n\n\\usepackage{quiver}\n\n\\usepackage{amssymb}\n\\begin{document}\n\\begin{tikzcd} A \\arrow[r] & B \\end{tikzcd}\n\\end{document}\n```";

		expect(convertTikzBlocksToRaw(block)).toBe(
			"```{=latex}\n\\begin{center}\n\\begin{tikzcd} A \\arrow[r] & B \\end{tikzcd}\n\\end{center}\n```",
		);
	});
});

describe("tikz blocks inside a callout", () => {
	const quoted = "> [!task] Exercise 3\n> Some text.\n>\n> ```tikz\n> \\begin{document}\n> \\begin{tikzpicture}\n> \\draw (0,0) circle (1);\n> \\end{tikzpicture}\n> \\end{document}\n> ```\n\nAfter.";

	it("converts a quoted tikz fence and keeps it quoted", () => {
		expect(convertTikzBlocksToRaw(quoted)).toBe(
			"> [!task] Exercise 3\n> Some text.\n>\n> ```{=latex}\n> \\begin{center}\n> \\begin{tikzpicture}\n> \\draw (0,0) circle (1);\n> \\end{tikzpicture}\n> \\end{center}\n> ```\n\nAfter.",
		);
	});

	it("still hoists \\usepackage{tikz} for a quoted block", () => {
		expect(collectTikzPreamble(quoted)).toEqual(["\\usepackage{tikz}"]);
	});

	it("converts nested quoted blocks too", () => {
		expect(convertTikzBlocksToRaw("> > ```tikz\n> > \\draw (0,0);\n> > ```")).toBe(
			"> > ```{=latex}\n> > \\begin{center}\n> > \\draw (0,0);\n> > \\end{center}\n> > ```",
		);
	});
});
