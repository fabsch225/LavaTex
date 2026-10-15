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
});
