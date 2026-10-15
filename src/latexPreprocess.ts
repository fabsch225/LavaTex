/**
 * Runs every note-syntax -> pandoc-syntax preprocessing pass, shared by both
 * the single-note and multi-chapter-project LaTeX export paths.
 */
import { getFrontmatterInfo, parseFrontmatter } from "./frontmatter";
import { expandCitations } from "./citations";
import { resolveFrontmatterReferences } from "./frontmatterRefs";
import { convertCallouts } from "./latex/calloutBlocks";
import { convertCodeBlocksToRaw } from "./latex/codeBlocks";
import { convertImageEmbeds, folderOf } from "./latex/imageEmbeds";
import { convertAlignBlocksToRaw } from "./latex/rawEnvironments";
import { expandReferenceShortcuts } from "./latex/referenceShortcuts";
import { preprocessTheoremBlocks } from "./latex/theoremBlockPreprocessor";
import { collectEnvironmentTriggers } from "./latex/theoremEnvironments";
import { convertTikzBlocksToRaw } from "./latex/tikzBlocks";
import { stripWikilinks } from "./latex/wikilinks";
import type { NoteRef, NoteReader } from "./notes";

export async function preprocessNoteForLatex(reader: NoteReader, note: NoteRef, rawText: string): Promise<string> {
	let raw = await resolveFrontmatterReferences(reader, note, rawText);
	raw = await expandCitations(reader, note, raw);
	const frontmatterInfo = getFrontmatterInfo(raw);
	const frontmatter = frontmatterInfo.exists ? parseFrontmatter(frontmatterInfo.frontmatter) : undefined;
	const triggers = collectEnvironmentTriggers(frontmatter);

	// Only the body, never the frontmatter block: a `"[[Note]]"` frontmatter
	// value (an unresolved preamble/macros/theorems/bibliography-raw
	// reference, or just a field this package doesn't know about) is a
	// completely different thing from a wikilink written in prose, and
	// stripping it there would silently break the former.
	const frontmatterBlock = frontmatterInfo.exists ? raw.slice(0, frontmatterInfo.contentStart) : "";
	const body = stripWikilinks(
		convertImageEmbeds(frontmatterInfo.exists ? raw.slice(frontmatterInfo.contentStart) : raw, reader, note, folderOf(note.path)),
	);

	return expandReferenceShortcuts(
		preprocessTheoremBlocks(
			convertCallouts(
				convertTikzBlocksToRaw(convertCodeBlocksToRaw(convertAlignBlocksToRaw(frontmatterBlock + body))),
				triggers,
			),
			triggers,
		),
	);
}

/** Same passes, minus theorem/citation handling — done project-wide, once — for a project's chapter bodies. */
export function preprocessChapterBody(body: string, triggers: ReadonlyMap<string, string>): string {
	return expandReferenceShortcuts(
		preprocessTheoremBlocks(
			convertCallouts(
				convertTikzBlocksToRaw(convertCodeBlocksToRaw(convertAlignBlocksToRaw(stripWikilinks(body)))),
				triggers,
			),
			triggers,
		),
	);
}
