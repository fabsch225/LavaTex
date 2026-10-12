import { describe, expect, it } from "vitest";

import { convertCodeBlocksToRaw } from "../src/latex/codeBlocks";

describe("convertCodeBlocksToRaw", () => {
	it("converts a fenced code block to a raw lstlisting regardless of language tag", () => {
		const python = convertCodeBlocksToRaw("```python\nprint('hi')\n```");
		const r = convertCodeBlocksToRaw("```r\nn <- 1\n```");

		expect(python).toBe("```{=latex}\n\\begin{lstlisting}\nprint('hi')\n\\end{lstlisting}\n```");
		expect(r).toBe("```{=latex}\n\\begin{lstlisting}\nn <- 1\n\\end{lstlisting}\n```");
	});

	it("discards the language tag itself — it never becomes a [language=...] option", () => {
		const result = convertCodeBlocksToRaw("```python\nx = 1\n```");

		expect(result).not.toContain("python");
		expect(result).not.toContain("[language");
	});

	it("leaves ```tikz``` blocks alone for tikzBlocks.ts to handle", () => {
		const input = "```tikz\n\\begin{tikzpicture}\\end{tikzpicture}\n```";

		expect(convertCodeBlocksToRaw(input)).toBe(input);
	});

	it("leaves a bare, untagged fenced block untouched", () => {
		const input = "```\nplain text\n```";

		expect(convertCodeBlocksToRaw(input)).toBe(input);
	});
});
