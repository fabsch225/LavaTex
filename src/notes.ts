/**
 * The one seam between this package's export logic and whatever note store
 * it's running against — an Obsidian vault (see `latex-exporter/`'s
 * `ObsidianNoteReader` adapter), a plain directory of markdown files, or
 * anything else. Everything downstream only ever needs to read a note's raw
 * text and resolve a `[[wikilink]]`-style link relative to some other note;
 * it never touches a filesystem or vault API directly.
 */

/** Identifies a note, independent of what actually stores it. */
export interface NoteRef {
	path: string;
	basename: string;
}

export interface NoteReader {
	/** Raw markdown text of `note`, frontmatter included. */
	read(note: NoteRef): Promise<string>;
	/** Resolves a `[[linkpath]]` (without the brackets) written in `from` to the note it points at, or `undefined` if unresolved. */
	resolveLink(from: NoteRef, linkpath: string): NoteRef | undefined;
}
