/**
 * Assembles a multi-chapter document — book/report scale, e.g. a Bachelor's
 * thesis — from a "master" note's `chapters:` frontmatter: an ordered list
 * of `[[wikilinks]]` to chapter notes, each preprocessed the same way a
 * standalone note would be, then concatenated into a single pandoc pass.
 *
 * Master note frontmatter (on top of everything a single note already
 * supports — `preamble`, `theorems`, `macros`, `title`/`author`/`date`, ...):
 *
 *   chapters:
 *     - "[[00 Motivation]]"
 *     - "[[10 Stochastic Processes]]"
 *     - "[[70 Appendix]]"
 *   documentclass: report   # or book; defaults to report
 *   division: chapter       # pandoc --top-level-division; defaults to chapter
 *   numberwithin: chapter   # \numberwithin{equation}{...}; defaults to section
 *   appendix-from: "[[70 Appendix]]"   # optional: \appendix before this chapter
 *   toc: true                          # defaults to true for project export
 *
 * The master note's own body (if any) is treated as front matter content —
 * an abstract, dedication, etc. — placed before the first chapter.
 */
import { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import { expandCitationsAcrossFiles } from "./citations";
import { readNote, resolveFrontmatterReferences, resolveLinkpath } from "./frontmatterRefs";
import { preprocessChapterBody } from "./latexPreprocess";
import type { LatexAssets } from "./latexExport";
import type { NoteRef, NoteReader } from "./notes";
import type { PandocBackend } from "./pandoc/types";
import { extractRawLatexFrontmatter } from "./rawLatexFrontmatter";
import { collectEnvironmentTriggers } from "./latex/theoremEnvironments";

const WIKILINK = /^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/;

function linkpathOf(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const match = WIKILINK.exec(value.trim());
	return match ? match[1] : undefined;
}

export async function exportProjectToLatex(
	reader: NoteReader,
	master: NoteRef,
	masterRawText: string,
	backend: PandocBackend,
	assets: LatexAssets,
	cwd?: string,
): Promise<string> {
	const masterRaw = await resolveFrontmatterReferences(reader, master, masterRawText);
	const info = getFrontmatterInfo(masterRaw);
	if (!info.exists) {
		throw new Error("Master note needs frontmatter with a `chapters:` list.");
	}
	const frontmatter = parseFrontmatter(info.frontmatter);

	const chapterField = frontmatter["chapters"];
	if (!Array.isArray(chapterField) || chapterField.length === 0) {
		throw new Error("Master note's frontmatter needs a non-empty `chapters:` list of [[wikilinks]].");
	}

	const chapters: { note: NoteRef; body: string }[] = [];
	for (const entry of chapterField) {
		const linkpath = linkpathOf(entry);
		if (!linkpath) {
			throw new Error(`\`chapters:\` entry is not a [[wikilink]]: ${JSON.stringify(entry)}`);
		}
		const note = resolveLinkpath(reader, master, linkpath);
		if (!note) {
			throw new Error(`Chapter link not found: [[${linkpath}]]`);
		}
		const { body } = await readNote(reader, note);
		chapters.push({ note, body });
	}

	const appendixLinkpath = linkpathOf(frontmatter["appendix-from"]);
	const appendixNote = appendixLinkpath ? resolveLinkpath(reader, master, appendixLinkpath) : undefined;
	if (appendixLinkpath && !appendixNote) {
		throw new Error(`\`appendix-from:\` link not found: [[${appendixLinkpath}]]`);
	}

	const { texts, bibliographyRaw } = await expandCitationsAcrossFiles(
		reader,
		chapters.map((chapter) => ({ note: chapter.note, text: chapter.body })),
	);

	const triggers = collectEnvironmentTriggers(frontmatter);

	const parts: string[] = [];
	const masterBody = masterRaw.slice(info.contentStart).trim();
	if (masterBody) {
		parts.push(preprocessChapterBody(masterBody, triggers));
	}

	chapters.forEach((chapter, i) => {
		if (appendixNote && chapter.note.path === appendixNote.path) {
			parts.push("```{=latex}\n\\appendix\n```");
		}
		parts.push(preprocessChapterBody(texts[i], triggers));
	});

	if (bibliographyRaw) {
		frontmatter["bibliography-raw"] = bibliographyRaw;
	}
	if (!("documentclass" in frontmatter)) {
		frontmatter["documentclass"] = "report";
	}
	if (!("division" in frontmatter)) {
		frontmatter["division"] = "chapter";
	}
	if (!("toc" in frontmatter)) {
		frontmatter["toc"] = true;
	}
	const division = frontmatter["division"];
	delete frontmatter["chapters"];
	delete frontmatter["appendix-from"];
	delete frontmatter["division"];

	const { frontmatter: strippedFrontmatter, headerIncludes, afterBody } = extractRawLatexFrontmatter(frontmatter);

	const combined = "---\n" + stringifyFrontmatter(strippedFrontmatter) + "---\n\n" + parts.join("\n\n") + "\n";

	return backend.convert({
		markdown: combined,
		template: assets.template,
		luaFilter: assets.luaFilter,
		topLevelDivision: typeof division === "string" ? division : "chapter",
		headerIncludes,
		afterBody,
		cwd,
	});
}
