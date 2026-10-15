import { describe, expect, it } from "vitest";

import { applyDefaultFrontmatter } from "../src/defaultFrontmatter";
import { getFrontmatterInfo, parseFrontmatter } from "../src/frontmatter";
import { fakeNoteReader } from "./fakeNoteReader";

const NOTES = {
	Default:
		'---\ntitle: Template Title\nauthor: Fabian\nfontsize: 12pt\npreamble: "[[preamble]]"\n---\nTemplate body is ignored.\n',
	preamble: "\\usepackage{amsmath}\n",
};
const template = { path: "Util/Default.md", basename: "Default" };

function frontmatterOf(text: string): Record<string, unknown> {
	return parseFrontmatter(getFrontmatterInfo(text).frontmatter);
}

describe("applyDefaultFrontmatter", () => {
	it("gives a note without frontmatter the template's fields, resolved, and its file name as title", async () => {
		const note = { path: "Scratch/my sheet.md", basename: "my sheet" };
		const out = await applyDefaultFrontmatter(fakeNoteReader(NOTES), note, "# Body\n", template);

		expect(frontmatterOf(out)).toEqual({
			title: "my sheet",
			author: "Fabian",
			fontsize: "12pt",
			preamble: "\\usepackage{amsmath}",
		});
		expect(out.slice(getFrontmatterInfo(out).contentStart)).toBe("# Body\n");
	});

	it("lets the note's own fields, including title, win", async () => {
		const note = { path: "note.md", basename: "note" };
		const out = await applyDefaultFrontmatter(fakeNoteReader(NOTES), note, "---\ntitle: Own\nfontsize: 10pt\n---\nBody", template);

		expect(frontmatterOf(out)).toMatchObject({ title: "Own", fontsize: "10pt", author: "Fabian" });
	});

	it("still titles the note after its file name without a template", async () => {
		const note = { path: "note.md", basename: "note" };
		const out = await applyDefaultFrontmatter(fakeNoteReader(NOTES), note, "Body", undefined);

		expect(frontmatterOf(out)).toEqual({ title: "note" });
	});
});
