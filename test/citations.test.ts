import { describe, expect, it } from "vitest";

import { expandCitations, expandCitationsAcrossFiles } from "../src/citations";
import { fakeNoteReader } from "./fakeNoteReader";

const SOURCE_FRONTMATTER =
	'---\nkey: smith2020\nbibitem: "\\\\bibitem[Smi20]{smith2020} J. Smith, Title, 2020."\n---\n';

describe("expandCitations", () => {
	it("turns &[[Source]] into a raw \\cite{} span and injects bibliography-raw", async () => {
		const reader = fakeNoteReader({ "Some Source": SOURCE_FRONTMATTER });
		const note = { path: "note.md", basename: "note" };

		const result = await expandCitations(reader, note, "See &[[Some Source]] for details.");

		expect(result).toContain("`\\cite{smith2020}`{=latex}");
		expect(result).toContain("bibliography-raw:");
		expect(result).toContain("\\begin{thebibliography}{9}");
	});

	it("leaves text with no citations untouched", async () => {
		const reader = fakeNoteReader({});
		const note = { path: "note.md", basename: "note" };

		const result = await expandCitations(reader, note, "Nothing to cite here.");

		expect(result).toBe("Nothing to cite here.");
	});
});

describe("expandCitationsAcrossFiles", () => {
	it("shares one \\cite{} key across chapters citing the same source", async () => {
		const reader = fakeNoteReader({ "Some Source": SOURCE_FRONTMATTER });
		const chapterA = { path: "a.md", basename: "a" };
		const chapterB = { path: "b.md", basename: "b" };

		const { texts, bibliographyRaw } = await expandCitationsAcrossFiles(reader, [
			{ note: chapterA, text: "First &[[Some Source]] mention." },
			{ note: chapterB, text: "Second &[[Some Source]] mention." },
		]);

		expect(texts[0]).toContain("`\\cite{smith2020}`{=latex}");
		expect(texts[1]).toContain("`\\cite{smith2020}`{=latex}");
		expect(bibliographyRaw.match(/\\bibitem/g)?.length).toBe(1);
	});
});
