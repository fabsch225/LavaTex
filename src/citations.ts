/**
 * `&[[Some Source]]` -> a raw `\cite{key}` span, where `key` and the
 * hardcoded `\bibitem[...]{key}` entry both come from that note's own
 * frontmatter (`key:`, `bibitem:`) — one note per source, instead of
 * maintaining a single `\begin{thebibliography}` block by hand.
 *
 * Every distinct source cited this way has its `bibitem:` collected and
 * spliced into `bibliography-raw` automatically, so the exported
 * bibliography always matches exactly what got cited.
 */
import { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import { readNote, resolveLinkpath } from "./frontmatterRefs";
import type { NoteRef, NoteReader } from "./notes";

const CITATION = /&\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

/** Scans one note's text for `&[[Source]]` citations, adding any newly-seen ones to the shared maps. */
async function collectCitations(
	reader: NoteReader,
	sourceNote: NoteRef,
	rawText: string,
	keyByLinkpath: Map<string, string>,
	bibitemsByKey: Map<string, string>,
): Promise<void> {
	for (const match of rawText.matchAll(CITATION)) {
		const linkpath = match[1].trim();
		if (keyByLinkpath.has(linkpath)) {
			continue;
		}
		const target = resolveLinkpath(reader, sourceNote, linkpath);
		if (!target) {
			continue;
		}
		const { frontmatter } = await readNote(reader, target);
		const key = typeof frontmatter["key"] === "string" ? (frontmatter["key"] as string) : target.basename;
		keyByLinkpath.set(linkpath, key);
		if (typeof frontmatter["bibitem"] === "string" && !bibitemsByKey.has(key)) {
			bibitemsByKey.set(key, (frontmatter["bibitem"] as string).trim());
		}
	}
}

function substituteCitations(text: string, keyByLinkpath: ReadonlyMap<string, string>): string {
	return text.replace(CITATION, (whole, rawLinkpath: string) => {
		const key = keyByLinkpath.get(rawLinkpath.trim());
		return key ? "`\\cite{" + key + "}`{=latex}" : whole;
	});
}

function assembleBibliography(bibitemsByKey: ReadonlyMap<string, string>): string {
	return "\\begin{thebibliography}{9}\n" + [...bibitemsByKey.values()].join("\n\n") + "\n\\end{thebibliography}";
}

export async function expandCitations(reader: NoteReader, sourceNote: NoteRef, rawText: string): Promise<string> {
	const keyByLinkpath = new Map<string, string>();
	const bibitemsByKey = new Map<string, string>();
	await collectCitations(reader, sourceNote, rawText, keyByLinkpath, bibitemsByKey);

	const text = substituteCitations(rawText, keyByLinkpath);
	if (bibitemsByKey.size === 0) {
		return text;
	}

	const info = getFrontmatterInfo(text);
	const frontmatter = info.exists ? parseFrontmatter(info.frontmatter) : {};
	frontmatter["bibliography-raw"] = assembleBibliography(bibitemsByKey);

	return "---\n" + stringifyFrontmatter(frontmatter) + "---\n" + text.slice(info.contentStart);
}

/**
 * Same expansion, but sharing one key/bibitem table across every note in a
 * multi-chapter project — so a source cited from two different chapters
 * gets one `\cite{}` key and one bibliography entry, not two, and citation
 * order (and therefore bibliography order) follows first-cited-across-the-
 * whole-project rather than per-note.
 */
export async function expandCitationsAcrossFiles(
	reader: NoteReader,
	entries: { note: NoteRef; text: string }[],
): Promise<{ texts: string[]; bibliographyRaw: string }> {
	const keyByLinkpath = new Map<string, string>();
	const bibitemsByKey = new Map<string, string>();

	for (const entry of entries) {
		await collectCitations(reader, entry.note, entry.text, keyByLinkpath, bibitemsByKey);
	}

	const texts = entries.map((entry) => substituteCitations(entry.text, keyByLinkpath));
	const bibliographyRaw = bibitemsByKey.size > 0 ? assembleBibliography(bibitemsByKey) : "";

	return { texts, bibliographyRaw };
}
