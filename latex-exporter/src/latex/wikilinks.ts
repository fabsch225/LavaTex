/**
 * Strips ordinary Obsidian `[[wikilink]]`s down to their display text before
 * a note reaches pandoc.
 *
 * A note written for both personal knowledge management and export is free
 * to link `[[Other Note]]` the same way any other Obsidian note does — that
 * linking is exactly what this plugin isn't in the business of replacing
 * (see the "Fuse Knowledge Creation and Management" ambition: notes stay
 * notes, only the export step is special-purpose). `&[[Source]]` citations
 * (handled separately, before this pass ever runs) and frontmatter fields'
 * own `"[[Note]]"` values (resolved directly off the parsed YAML, never
 * touching body text) are unaffected — this only ever sees what's left in
 * the body: a plain cross-reference link with no meaning to a LaTeX/PDF/
 * plain-Markdown reader, which would otherwise surface as literal double
 * brackets (or a broken link) in the exported document.
 */
const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;

export function stripWikilinks(text: string): string {
	return text.replace(WIKILINK, (_whole, linkpath: string, alias: string | undefined) => {
		return (alias ?? linkpath).trim();
	});
}
