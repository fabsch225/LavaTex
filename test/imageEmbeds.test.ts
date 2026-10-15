import { describe, expect, it } from "vitest";

import { convertImageEmbeds } from "../src/latex/imageEmbeds";
import type { NoteRef, NoteReader } from "../src/notes";

/** Resolves by file name anywhere in the "vault", like Obsidian. */
function reader(paths: string[]): NoteReader {
	return {
		async read() {
			return "";
		},
		resolveLink(_from, linkpath) {
			const path = paths.find((p) => p === linkpath || p.endsWith(`/${linkpath}`));
			return path ? { path, basename: path.split("/").pop()! } : undefined;
		},
	};
}

const vault = reader(["attachments/plot.png", "Course/figures/diagram one.pdf", "Course/Week 1/local.jpg"]);
const note: NoteRef = { path: "Course/Week 1/Sheet.md", basename: "Sheet" };
const convert = (text: string, outputDir = "Course/Week 1") => convertImageEmbeds(text, vault, note, outputDir);

describe("convertImageEmbeds", () => {
	it("resolves an embed anywhere in the vault to a path relative to the output folder", () => {
		expect(convert("![[plot.png]]")).toBe("![](<../../attachments/plot.png>)");
		expect(convert("![[local.jpg]]")).toBe("![](<local.jpg>)");
		expect(convert("![[diagram one.pdf]]")).toBe("![](<../figures/diagram one.pdf>)");
	});

	it("turns |width and |widthxheight into size attributes, and other text into a caption", () => {
		expect(convert("![[plot.png|300]]")).toBe("![](<../../attachments/plot.png>){width=300px}");
		expect(convert("![[plot.png|300x200]]")).toBe("![](<../../attachments/plot.png>){width=300px height=200px}");
		expect(convert("![[plot.png|The plot]]")).toBe("![The plot](<../../attachments/plot.png>)");
	});

	it("is relative to a project's master folder when that's where LaTeX runs", () => {
		expect(convert("![[local.jpg]]", "Course")).toBe("![](<Week 1/local.jpg>)");
		expect(convert("![[plot.png]]", "")).toBe("![](<attachments/plot.png>)");
	});

	it("keeps an unresolved embed's path, and leaves note embeds and plain links alone", () => {
		expect(convert("![[missing.png]]")).toBe("![](<missing.png>)");
		expect(convert("![[Other note]] and [[plot.png]]")).toBe("![[Other note]] and [[plot.png]]");
	});
});
