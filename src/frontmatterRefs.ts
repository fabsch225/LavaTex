/**
 * Resolves `[[wikilink]]`-valued frontmatter fields (`macros:`,
 * `bibliography-raw:`, `preamble:`, `theorems:`) to content pulled from
 * another note, so that content can live in its own file instead of being
 * inlined in every note that wants it.
 */
import { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import type { NoteRef, NoteReader } from "./notes";

const WIKILINK = /^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/;

/** Resolves a wikilink's target (without the `[[ ]]`) to a note. */
export function resolveLinkpath(reader: NoteReader, sourceNote: NoteRef, linkpath: string): NoteRef | undefined {
	return reader.resolveLink(sourceNote, linkpath.trim());
}

function resolveWikilinkNote(reader: NoteReader, sourceNote: NoteRef, value: unknown): NoteRef | undefined {
	if (typeof value !== "string") {
		return undefined;
	}
	const match = WIKILINK.exec(value.trim());
	if (!match) {
		return undefined;
	}
	return resolveLinkpath(reader, sourceNote, match[1]);
}

/** Reads a note's parsed frontmatter and its body text (frontmatter stripped). */
export async function readNote(
	reader: NoteReader,
	note: NoteRef,
): Promise<{ frontmatter: Record<string, unknown>; body: string }> {
	const raw = await reader.read(note);
	const info = getFrontmatterInfo(raw);
	const frontmatter = info.exists ? parseFrontmatter(info.frontmatter) : {};
	return { frontmatter, body: raw.slice(info.contentStart) };
}

// Raw text inserted verbatim into the exported .tex (parallels how these
// fields already worked when written inline).
const TEXT_FIELDS = ["macros", "bibliography-raw", "preamble"] as const;

/**
 * Rewrites `rawText`'s frontmatter block, replacing any of the fields above
 * that hold a `[[wikilink]]` with the referenced note's content (its body
 * for the text fields, its own `theorems:` field for `theorems:`). Fields
 * left as literal inline values — the original style — pass through
 * unchanged, so both keep working side by side.
 */
export async function resolveFrontmatterReferences(
	reader: NoteReader,
	note: NoteRef,
	rawText: string,
): Promise<string> {
	const info = getFrontmatterInfo(rawText);
	if (!info.exists) {
		return rawText;
	}
	const frontmatter = parseFrontmatter(info.frontmatter);

	let changed = false;
	for (const key of TEXT_FIELDS) {
		const target = resolveWikilinkNote(reader, note, frontmatter[key]);
		if (!target) {
			continue;
		}
		const { body } = await readNote(reader, target);
		frontmatter[key] = body.trim();
		changed = true;
	}

	const theoremsTarget = resolveWikilinkNote(reader, note, frontmatter["theorems"]);
	if (theoremsTarget) {
		const { frontmatter: referenced } = await readNote(reader, theoremsTarget);
		frontmatter["theorems"] = referenced["theorems"];
		changed = true;
	}

	if (!changed) {
		return rawText;
	}
	return "---\n" + stringifyFrontmatter(frontmatter) + "---\n" + rawText.slice(info.contentStart);
}
