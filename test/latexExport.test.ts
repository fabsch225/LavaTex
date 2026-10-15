import { describe, expect, it } from "vitest";

import { exportNoteToLatex } from "../src/latexExport";
import type { PandocBackend, PandocInput } from "../src/pandoc/types";
import { fakeNoteReader } from "./fakeNoteReader";

function captureBackend(): { backend: PandocBackend; calls: PandocInput[] } {
	const calls: PandocInput[] = [];
	return {
		calls,
		backend: {
			async convert(input: PandocInput): Promise<string> {
				calls.push(input);
				return "%% fake latex output";
			},
		},
	};
}

const ASSETS = { template: "$body$", luaFilter: "-- no-op" };

describe("exportNoteToLatex", () => {
	it("hands the backend preprocessed markdown and returns its output verbatim", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const { backend, calls } = captureBackend();

		const result = await exportNoteToLatex(reader, note, "Hello *world*.", backend, ASSETS);

		expect(result).toBe("%% fake latex output");
		expect(calls).toHaveLength(1);
		expect(calls[0].markdown).toContain("Hello *world*.");
		expect(calls[0].template).toBe(ASSETS.template);
		expect(calls[0].luaFilter).toBe(ASSETS.luaFilter);
	});

	it("moves preamble:/macros: into headerIncludes and bibliography-raw: into afterBody, stripped from the frontmatter sent to pandoc", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const { backend, calls } = captureBackend();
		const raw = "---\ntitle: Foo\npreamble: \\usepackage{amsmath}\nbibliography-raw: \\bibitem{x} X.\n---\nBody.\n";

		await exportNoteToLatex(reader, note, raw, backend, ASSETS);

		expect(calls[0].headerIncludes).toBe("\\usepackage{amsmath}");
		expect(calls[0].afterBody).toBe("\\bibitem{x} X.");
		expect(calls[0].markdown).not.toContain("preamble");
		expect(calls[0].markdown).not.toContain("bibliography-raw");
		expect(calls[0].markdown).toContain("title: Foo");
	});

	it("rejects a note with a chapters: list, pointing at the project export instead", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const { backend } = captureBackend();
		const raw = "---\nchapters:\n  - \"[[Chapter 1]]\"\n---\nBody.\n";

		await expect(exportNoteToLatex(reader, note, raw, backend, ASSETS)).rejects.toThrow(/chapters/);
	});

	it("passes cwd through to the backend when given", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const { backend, calls } = captureBackend();

		await exportNoteToLatex(reader, note, "Body.", backend, ASSETS, "/some/dir");

		expect(calls[0].cwd).toBe("/some/dir");
	});

	it("adds tikz blocks' packages to the preamble, and numbers plainly in a note without headings", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const { backend, calls } = captureBackend();
		const raw =
			"---\npreamble: \\usepackage{amsmath}\ntheorems:\n  - {id: theorem, name: Theorem, counter: section}\n  - {id: lemma, name: Lemma, like: theorem}\n---\n" +
			"**Theorem**\nText.\n∎\n\n```tikz\n\\usepackage{tikz-cd}\n\\begin{document}\n\\begin{tikzcd} A \\end{tikzcd}\n\\end{document}\n```\n";

		await exportNoteToLatex(reader, note, raw, backend, ASSETS);

		expect(calls[0].headerIncludes).toBe("\\usepackage{amsmath}\n\\usepackage{tikz}\n\\usepackage{tikz-cd}");
		expect(calls[0].markdown).toContain("nosections: true");
		expect(calls[0].markdown).not.toContain("counter: section");
		expect(calls[0].markdown).toContain("like: theorem");
	});

	it("keeps section numbering when the note has headings", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };
		const { backend, calls } = captureBackend();
		const raw = "---\ntheorems:\n  - {id: theorem, name: Theorem, counter: section}\n---\n# Intro\n\n**Theorem**\nText.\n∎\n";

		await exportNoteToLatex(reader, note, raw, backend, ASSETS);

		expect(calls[0].markdown).toContain("counter: section");
		expect(calls[0].markdown).not.toContain("nosections");
	});
});

