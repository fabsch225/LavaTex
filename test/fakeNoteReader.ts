import type { NoteRef, NoteReader } from "../src/notes";

/** An in-memory NoteReader for tests: notes keyed by basename (no alias/fuzzy resolution). */
export function fakeNoteReader(notes: Record<string, string>): NoteReader {
	const refs = new Map<string, NoteRef>();
	for (const basename of Object.keys(notes)) {
		refs.set(basename, { path: `${basename}.md`, basename });
	}
	return {
		async read(note: NoteRef): Promise<string> {
			const content = notes[note.basename];
			if (content === undefined) {
				throw new Error(`No such note: ${note.basename}`);
			}
			return content;
		},
		resolveLink(_from: NoteRef, linkpath: string): NoteRef | undefined {
			return refs.get(linkpath.trim());
		},
	};
}
