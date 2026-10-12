import { describe, expect, it } from "vitest";

import { resolveNumbering } from "../src/latex/markdownNumbering";

describe("resolveNumbering", () => {
	it("numbers a $$...$$ {#eq:...} equation with a tab-indented \\tag{...} inside the math, not trailing text after $$", () => {
		const body = ["$$", "x = y", "$$ {#eq:foo}", ""].join("\n");

		const result = resolveNumbering(body, [], "section");

		expect(result).toBe(["$$", "x = y", "\t\\tag{1}", "$$", ""].join("\n"));
	});

	it("numbers a label on its own line after the closing $$ the same way", () => {
		const body = ["$$", "x = y", "$$", "{#eq:foo}", ""].join("\n");

		const result = resolveNumbering(body, [], "section");

		expect(result).toBe(["$$", "x = y", "\t\\tag{1}", "$$", ""].join("\n"));
	});

	it("substitutes [#eq:...]/[@eq:...] references with the resolved number", () => {
		const body = ["$$", "x = y", "$$ {#eq:foo}", "See [#eq:foo] and [@eq:foo]."].join("\n");

		const result = resolveNumbering(body, [], "section");

		expect(result).toContain("See 1 and (1).");
	});

	it("numbers equations as section.count when numberwithin is section", () => {
		const body = ["# One", "$$", "a", "$$ {#eq:a}", "$$", "b", "$$ {#eq:b}", "[#eq:a] and [#eq:b]"].join("\n");

		const result = resolveNumbering(body, [], "section");

		expect(result).toContain("\\tag{1.1}");
		expect(result).toContain("\\tag{1.2}");
		expect(result).toContain("1.1 and 1.2");
	});
});
