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
 * One frontmatter value split into its parts: every `[[wikilink]]` becomes
 * the note it points at, anything else stays a literal inline value. A
 * field names several notes as a YAML list `["[[a]]", "[[b]]"]` (the form
 * Obsidian's properties editor writes), whose entries may also mix in
 * inline values. Returns null when the value
 * holds no wikilink at all, i.e. is entirely inline — the original style.
 */
function splitSources(
	reader: NoteReader,
	sourceNote: NoteRef,
	key: string,
	value: unknown,
): ({ note: NoteRef } | { inline: unknown })[] | null {
	const items: unknown[] = Array.isArray(value) ? value : [value];

	let anyLink = false;
	const parts = items.map((item) => {
		if (typeof item !== "string" || !WIKILINK.test(item.trim())) {
			return { inline: item };
		}
		anyLink = true;
		const note = resolveWikilinkNote(reader, sourceNote, item);
		if (!note) {
			throw new Error(`\`${key}:\` link not found: ${item.trim()}`);
		}
		return { note };
	});
	return anyLink ? parts : null;
}

/**
 * Rewrites `rawText`'s frontmatter block, replacing every `[[wikilink]]` in
 * the fields above with the referenced note's content — its body for the
 * text fields, its own `theorems:` field for `theorems:` — concatenated in
 * the order listed, so a document can be composed from several shared
 * preamble/macro/theorem notes. Fields left as literal inline values pass
 * through unchanged, so both styles keep working side by side.
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
		const parts = splitSources(reader, note, key, frontmatter[key]);
		if (!parts) {
			continue;
		}
		const texts: string[] = [];
		for (const part of parts) {
			const text = "note" in part ? (await readNote(reader, part.note)).body : String(part.inline ?? "");
			if (text.trim()) texts.push(text.trim());
		}
		frontmatter[key] = texts.join("\n\n");
		changed = true;
	}

	if (splitSources(reader, note, "theorems", frontmatter["theorems"])) {
		frontmatter["theorems"] = await resolveTheorems(reader, note, frontmatter["theorems"], new Set([note.path]));
		changed = true;
	}

	if (!changed) {
		return rawText;
	}
	return "---\n" + stringifyFrontmatter(frontmatter) + "---\n" + rawText.slice(info.contentStart);
}

/**
 * Flattens a `theorems:` value into one list of environment specs. A linked
 * note's own `theorems:` may in turn link further notes (a shared base set
 * extended per course, say); `visited` stops a cycle. When two sources
 * declare the same `id`, the first one wins — a second `\newtheorem` of the
 * same name would be a LaTeX error.
 */
async function resolveTheorems(
	reader: NoteReader,
	sourceNote: NoteRef,
	value: unknown,
	visited: Set<string>,
): Promise<unknown[]> {
	const parts = splitSources(reader, sourceNote, "theorems", value) ?? [{ inline: value }];
	const specs: unknown[] = [];
	for (const part of parts) {
		if ("note" in part) {
			if (visited.has(part.note.path)) continue;
			visited.add(part.note.path);
			const { frontmatter: referenced } = await readNote(reader, part.note);
			specs.push(...(await resolveTheorems(reader, part.note, referenced["theorems"], visited)));
		} else if (Array.isArray(part.inline)) {
			specs.push(...part.inline);
		} else if (part.inline && typeof part.inline === "object") {
			specs.push(part.inline);
		}
	}

	const seen = new Set<string>();
	return specs.filter((spec) => {
		const id = (spec as { id?: unknown })?.id;
		if (typeof id !== "string") return true;
		if (seen.has(id)) return false;
		seen.add(id);
		return true;
	});
}
