/**
 * Lets any note be exported without frontmatter of its own: a designated
 * template note's frontmatter supplies every field the note doesn't set
 * itself (preamble, theorems, author, layout knobs, ...), so a quick
 * scratch note compiles with the same setup as a polished one. The
 * template is an ordinary note, so it can double as an Obsidian template
 * for new notes.
 *
 * Fields merge key by key, the note's own value winning. `title` is the
 * one exception: it never comes from the template — a note without a
 * `title:` is titled after its file name instead.
 */
import { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import { resolveFrontmatterReferences } from "./frontmatterRefs";
import type { NoteRef, NoteReader } from "./notes";

export async function applyDefaultFrontmatter(
	reader: NoteReader,
	note: NoteRef,
	rawText: string,
	template: NoteRef | undefined,
): Promise<string> {
	const info = getFrontmatterInfo(rawText);
	const own = info.exists ? parseFrontmatter(info.frontmatter) : {};
	const body = info.exists ? rawText.slice(info.contentStart) : rawText;

	let defaults: Record<string, unknown> = {};
	if (template && template.path !== note.path) {
		// Resolved against the template itself, so its `[[links]]` mean
		// what they do there, wherever the exported note lives.
		const resolved = await resolveFrontmatterReferences(reader, template, await reader.read(template));
		const templateInfo = getFrontmatterInfo(resolved);
		defaults = templateInfo.exists ? parseFrontmatter(templateInfo.frontmatter) : {};
		delete defaults["title"];
	}

	const merged: Record<string, unknown> = { title: note.basename, ...defaults, ...own };
	return "---\n" + stringifyFrontmatter(merged) + "---\n" + body;
}
