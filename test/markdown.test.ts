import { describe, expect, it } from "vitest";

import { exportNoteToMarkdown } from "../src/markdown";
import { fakeNoteReader } from "./fakeNoteReader";

describe("exportNoteToMarkdown", () => {
	it("needs no pandoc backend at all and trims frontmatter to title/author/date", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const raw = "---\ntitle: Foo\nauthor: Bar\npreamble: \\usepackage{amsmath}\n---\nHello world.\n";

		const result = await exportNoteToMarkdown(reader, note, raw);

		expect(result).toContain("title: Foo");
		expect(result).toContain("author: Bar");
		expect(result).not.toContain("preamble");
		expect(result).toContain("Hello world.");
	});

	it("turns &[[Source]] citations into a native [^marker] footnote reference/definition pair", async () => {
		const reader = fakeNoteReader({
			"Some Source": '---\nkey: smith2020\nbibitem: "\\\\bibitem[Smi20]{smith2020} J. Smith, Title, 2020."\n---\n',
		});
		const note = { path: "note.md", basename: "note" };
		const raw = "See &[[Some Source]] for details.";

		const result = await exportNoteToMarkdown(reader, note, raw);

		expect(result).toContain("See [^Smi20] for details.");
		expect(result).not.toContain("## Bibliography");
		expect(result).toContain("[^Smi20]: J. Smith, Title, 2020.");
	});

	it("strips plain [[wikilinks]] to their display text", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const raw = "See [[Other Note|this]] for more.";

		const result = await exportNoteToMarkdown(reader, note, raw);

		expect(result).toContain("See this for more.");
		expect(result).not.toContain("[[");
	});

	it("expands macros: invocations inline", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const raw = "---\nmacros: |\n  \\newcommand{\\pa}[1]{(#1)}\n---\n$\\pa{x}$\n";

		const result = await exportNoteToMarkdown(reader, note, raw);

		expect(result).toContain("$(x)$");
	});
});
