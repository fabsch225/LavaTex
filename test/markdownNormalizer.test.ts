import { describe, expect, it } from "vitest";

import { exportNoteToMarkdown } from "../src/markdown";
import { splitDisplayMath } from "../src/latex/markdownNormalizer";
import { fakeNoteReader } from "./fakeNoteReader";

describe("splitDisplayMath", () => {
	it("puts each $$ of a one-line display on its own line", () => {
		expect(splitDisplayMath("$$x = y$$")).toBe("$$\nx = y\n$$");
	});

	it("splits $$ off math and text that share its line", () => {
		expect(splitDisplayMath("Hence $$a\nb$$ so.")).toBe("Hence\n$$\na\nb\n$$\nso.");
	});

	it("keeps a trailing equation label on the closing $$", () => {
		expect(splitDisplayMath("$$x$$ {#eq:foo}")).toBe("$$\nx\n$$ {#eq:foo}");
		expect(splitDisplayMath("$$\nx\n$$ {#eq:foo}")).toBe("$$\nx\n$$ {#eq:foo}");
	});

	it("repeats a blockquote prefix and indentation on the split lines", () => {
		expect(splitDisplayMath("> $$x$$")).toBe("> $$\n> x\n> $$");
		expect(splitDisplayMath("  - $$x$$")).toBe("  - $$\n    x\n    $$");
		expect(splitDisplayMath("> 1. So $$x$$")).toBe("> 1. So\n>    $$\n>    x\n>    $$");
	});

	it("leaves code, inline code, escaped dollars and inline math alone", () => {
		const text = "```\n$$x$$\n```\nUse `$$x$$` or \\$$5 and $x$.";
		expect(splitDisplayMath(text)).toBe(text);
	});
});

describe("exportNoteToMarkdown display math", () => {
	it("numbers a one-line labelled equation after splitting it", async () => {
		const result = await exportNoteToMarkdown(fakeNoteReader({}), { path: "n.md", basename: "n" }, "$$x = y$$ {#eq:a}\nSee [@eq:a].");

		expect(result).toBe("$$\nx = y\n\t\\tag{1}\n$$\nSee (1).\n");
	});
});
