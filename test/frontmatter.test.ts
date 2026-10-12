import { describe, expect, it } from "vitest";

import { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "../src/frontmatter";

describe("getFrontmatterInfo", () => {
	it("reports no frontmatter for a note that doesn't start with a fence", () => {
		const info = getFrontmatterInfo("# Just a heading\n\nSome text.");
		expect(info.exists).toBe(false);
		expect(info.contentStart).toBe(0);
	});

	it("splits a leading --- fence from the body", () => {
		const content = "---\ntitle: Foo\nauthor: Bar\n---\n# Body\n";
		const info = getFrontmatterInfo(content);
		expect(info.exists).toBe(true);
		expect(info.frontmatter).toBe("title: Foo\nauthor: Bar");
		expect(content.slice(info.contentStart)).toBe("# Body\n");
	});

	it("round-trips through parse/stringify", () => {
		const data = { title: "Foo", tags: ["a", "b"], numberwithin: "chapter" };
		const yaml = stringifyFrontmatter(data);
		expect(parseFrontmatter(yaml)).toEqual(data);
	});
});
