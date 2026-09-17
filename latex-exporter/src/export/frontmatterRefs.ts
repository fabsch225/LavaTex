/**
 * Resolves `[[wikilink]]`-valued frontmatter fields (`macros:`,
 * `bibliography-raw:`, `preamble:`, `theorems:`) to content pulled from
 * another note, so that content can live in its own file instead of being
 * inlined in every note that wants it.
 *
 * Works directly off raw file text (`getFrontMatterInfo`/`parseYaml`), not
 * `MetadataCache`, so a just-created or just-edited referenced note doesn't
 * need to wait for Obsidian's cache to catch up.
 */
import { type App, type TFile, getFrontMatterInfo, parseYaml, stringifyYaml } from "obsidian";

const WIKILINK = /^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/;

/** Resolves an Obsidian linkpath (a wikilink's target, without the `[[ ]]`) to a file. */
export function resolveLinkpath(app: App, sourceFile: TFile, linkpath: string): TFile | undefined {
	return app.metadataCache.getFirstLinkpathDest(linkpath.trim(), sourceFile.path) ?? undefined;
}

function resolveWikilinkFile(app: App, sourceFile: TFile, value: unknown): TFile | undefined {
	if (typeof value !== "string") {
		return undefined;
	}
	const match = WIKILINK.exec(value.trim());
	if (!match) {
		return undefined;
	}
	return resolveLinkpath(app, sourceFile, match[1]);
}

/** Reads a note's parsed frontmatter and its body text (frontmatter stripped). */
export async function readNote(
	app: App,
	file: TFile,
): Promise<{ frontmatter: Record<string, unknown>; body: string }> {
	const raw = await app.vault.cachedRead(file);
	const info = getFrontMatterInfo(raw);
	const frontmatter = info.exists ? ((parseYaml(info.frontmatter) as Record<string, unknown>) ?? {}) : {};
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
export async function resolveFrontmatterReferences(app: App, file: TFile, rawText: string): Promise<string> {
	const info = getFrontMatterInfo(rawText);
	if (!info.exists) {
		return rawText;
	}
	const frontmatter = (parseYaml(info.frontmatter) as Record<string, unknown>) ?? {};

	let changed = false;
	for (const key of TEXT_FIELDS) {
		const target = resolveWikilinkFile(app, file, frontmatter[key]);
		if (!target) {
			continue;
		}
		const { body } = await readNote(app, target);
		frontmatter[key] = body.trim();
		changed = true;
	}

	const theoremsTarget = resolveWikilinkFile(app, file, frontmatter["theorems"]);
	if (theoremsTarget) {
		const { frontmatter: referenced } = await readNote(app, theoremsTarget);
		frontmatter["theorems"] = referenced["theorems"];
		changed = true;
	}

	if (!changed) {
		return rawText;
	}
	return "---\n" + stringifyYaml(frontmatter) + "---\n" + rawText.slice(info.contentStart);
}
