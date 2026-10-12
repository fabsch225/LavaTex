import { describe, expect, it } from "vitest";

import { exportProjectToLatex } from "../src/project";
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

describe("exportProjectToLatex", () => {
	it("concatenates chapters in order, defaults documentclass/division/toc, and shares citations", async () => {
		const reader = fakeNoteReader({
			"Chapter One": "# Chapter One\n\nFirst &[[Some Source]] mention.\n",
			"Chapter Two": "# Chapter Two\n\nSecond &[[Some Source]] mention.\n",
			"Some Source": '---\nkey: smith2020\nbibitem: "\\\\bibitem[Smi20]{smith2020} J. Smith, Title, 2020."\n---\n',
		});
		const master = { path: "master.md", basename: "master" };
		const { backend, calls } = captureBackend();
		const masterRaw = '---\nchapters:\n  - "[[Chapter One]]"\n  - "[[Chapter Two]]"\n---\n';

		await exportProjectToLatex(reader, master, masterRaw, backend, ASSETS);

		expect(calls).toHaveLength(1);
		const markdown = calls[0].markdown;
		expect(markdown.indexOf("Chapter One")).toBeLessThan(markdown.indexOf("Chapter Two"));
		expect(markdown).toContain("documentclass: report");
		expect(markdown).toContain("toc: true");
		expect((markdown.match(/\\cite\{smith2020\}/g) ?? []).length).toBe(2);
		expect(calls[0].topLevelDivision).toBe("chapter");
	});

	it("inserts \\appendix before the appendix-from chapter", async () => {
		const reader = fakeNoteReader({
			"Ch1": "Intro.\n",
			"Appendix": "Extra material.\n",
		});
		const master = { path: "master.md", basename: "master" };
		const { backend, calls } = captureBackend();
		const masterRaw = '---\nchapters:\n  - "[[Ch1]]"\n  - "[[Appendix]]"\nappendix-from: "[[Appendix]]"\n---\n';

		await exportProjectToLatex(reader, master, masterRaw, backend, ASSETS);

		const markdown = calls[0].markdown;
		expect(markdown.indexOf("\\appendix")).toBeGreaterThan(markdown.indexOf("Intro."));
		expect(markdown.indexOf("\\appendix")).toBeLessThan(markdown.indexOf("Extra material."));
	});

	it("throws when chapters: is missing or empty", async () => {
		const reader = fakeNoteReader({});
		const master = { path: "master.md", basename: "master" };
		const { backend } = captureBackend();

		await expect(exportProjectToLatex(reader, master, "---\ntitle: Foo\n---\n", backend, ASSETS)).rejects.toThrow(
			/chapters/,
		);
	});
});
