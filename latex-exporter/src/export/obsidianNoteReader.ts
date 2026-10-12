/**
 * Adapts an Obsidian `App` to lavatex-core's `NoteReader` interface —
 * `TFile` already structurally satisfies `NoteRef` (`path`/`basename`), so
 * the only real work here is turning `MetadataCache`'s wikilink resolution
 * into `resolveLink`.
 */
import type { App, TFile } from "obsidian";
import type { NoteReader, NoteRef } from "lavatex-core";

export function obsidianNoteReader(app: App): NoteReader {
	return {
		read(note: NoteRef): Promise<string> {
			return app.vault.cachedRead(note as TFile);
		},
		resolveLink(from: NoteRef, linkpath: string): NoteRef | undefined {
			return app.metadataCache.getFirstLinkpathDest(linkpath, from.path) ?? undefined;
		},
	};
}
