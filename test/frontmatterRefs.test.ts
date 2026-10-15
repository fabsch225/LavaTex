import { describe, expect, it } from "vitest";

import { getFrontmatterInfo, parseFrontmatter } from "../src/frontmatter";
import { resolveFrontmatterReferences } from "../src/frontmatterRefs";
import { fakeNoteReader } from "./fakeNoteReader";

const note = { path: "note.md", basename: "note" };

async function resolvedFrontmatter(notes: Record<string, string>, raw: string): Promise<Record<string, unknown>> {
	const resolved = await resolveFrontmatterReferences(fakeNoteReader(notes), note, raw);
	return parseFrontmatter(getFrontmatterInfo(resolved).frontmatter);
}

const NOTES = {
	preamble: "\\usepackage{amsmath}\n",
	"extra-preamble": "---\ntags: [x]\n---\n\\usepackage{tikz}\n",
	theorems: "---\ntheorems:\n  - {id: theorem, name: Theorem, counter: section}\n  - {id: lemma, name: Lemma, like: theorem}\n---\n",
	"other-theorems": '---\ntheorems:\n  - {id: task, name: Task, counter: section}\n  - {id: lemma, name: Hilfssatz, like: task}\n---\n',
	"course-theorems": '---\ntheorems:\n  - "[[theorems]]"\n  - "[[course-theorems]]"\n---\n',
};

describe("resolveFrontmatterReferences", () => {
	it("concatenates several linked notes' bodies, in order, for a text field", async () => {
		const fm = await resolvedFrontmatter(NOTES, '---\npreamble:\n  - "[[preamble]]"\n  - "[[extra-preamble]]"\n---\nBody.');

		expect(fm["preamble"]).toBe("\\usepackage{amsmath}\n\n\\usepackage{tikz}");
	});

	it("accepts a YAML list of links, mixed with inline values", async () => {
		const fm = await resolvedFrontmatter(NOTES, '---\nmacros:\n  - "[[preamble]]"\n  - "\\\\newcommand{\\\\R}{\\\\mathbb R}"\n---\n');

		expect(fm["macros"]).toBe("\\usepackage{amsmath}\n\n\\newcommand{\\R}{\\mathbb R}");
	});

	it("merges several theorems: notes, first declaration of an id winning", async () => {
		const fm = await resolvedFrontmatter(NOTES, '---\ntheorems:\n  - "[[theorems]]"\n  - "[[other-theorems]]"\n---\n');

		expect((fm["theorems"] as { id: string; name: string }[]).map((t) => `${t.id}:${t.name}`)).toEqual([
			"theorem:Theorem",
			"lemma:Lemma",
			"task:Task",
		]);
	});

	it("follows a linked theorems: note that links further notes, without looping", async () => {
		const fm = await resolvedFrontmatter(NOTES, '---\ntheorems:\n  - "[[course-theorems]]"\n  - {id: note, name: Note, like: theorem}\n---\n');

		expect((fm["theorems"] as { id: string }[]).map((t) => t.id)).toEqual(["theorem", "lemma", "note"]);
	});

	it("leaves inline values (and a comma-separated string, which isn't a list) alone", async () => {
		for (const raw of ["---\npreamble: \\usepackage{amsmath}\n---\nBody.", '---\npreamble: "[[preamble]], [[extra-preamble]]"\n---\n']) {
			expect(await resolveFrontmatterReferences(fakeNoteReader(NOTES), note, raw)).toBe(raw);
		}
	});

	it("reports a link that doesn't resolve", async () => {
		await expect(
			resolveFrontmatterReferences(fakeNoteReader(NOTES), note, '---\npreamble:\n  - "[[preamble]]"\n  - "[[missing]]"\n---\n'),
		).rejects.toThrow("`preamble:` link not found: [[missing]]");
	});
});
