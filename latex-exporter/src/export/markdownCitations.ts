/**
 * The plain-markdown counterpart to `citations.ts`: `&[[Some Source]]` still
 * resolves to that note's `key:`/`bibitem:` frontmatter, but instead of a
 * raw `\cite{key}` span (meaningless without a LaTeX compiler), it becomes
 * a plain `[marker]` — the source's `\bibitem[marker]{...}` short label if
 * it has one, else a running number — with a matching entry collected for
 * a generated bibliography section.
 */
import { type App, type TFile } from "obsidian";

import { readNote, resolveLinkpath } from "./frontmatterRefs";

const CITATION = /&\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
const BIBITEM_HEADER = /^\\bibitem(?:\[([^\]]*)\])?\{[^}]*\}[ \t]*\n?/;

export interface MarkdownCitations {
	text: string;
	/** One rendered `**[marker]** ...` line per distinct cited source, in citation order. */
	bibliography: string[];
}

export async function expandCitationsForMarkdown(
	app: App,
	sourceFile: TFile,
	rawText: string,
): Promise<MarkdownCitations> {
	const matches = [...rawText.matchAll(CITATION)];
	if (matches.length === 0) {
		return { text: rawText, bibliography: [] };
	}

	const markerByLinkpath = new Map<string, string>();
	const markerByKey = new Map<string, string>();
	const bibliography: string[] = [];

	for (const match of matches) {
		const linkpath = match[1].trim();
		if (markerByLinkpath.has(linkpath)) {
			continue;
		}
		const target = resolveLinkpath(app, sourceFile, linkpath);
		if (!target) {
			continue;
		}
		const { frontmatter } = await readNote(app, target);
		const key = typeof frontmatter["key"] === "string" ? (frontmatter["key"] as string) : target.basename;
		const bibitem = typeof frontmatter["bibitem"] === "string" ? (frontmatter["bibitem"] as string).trim() : "";

		let marker = markerByKey.get(key);
		if (!marker) {
			const headerMatch = BIBITEM_HEADER.exec(bibitem);
			const shortLabel = headerMatch?.[1]?.trim();
			marker = shortLabel || String(bibliography.length + 1);
			markerByKey.set(key, marker);

			const entryText = (headerMatch ? bibitem.slice(headerMatch[0].length) : bibitem).trim();
			bibliography.push(`**[${marker}]** ${entryText || key}`);
		}
		markerByLinkpath.set(linkpath, marker);
	}

	const text = rawText.replace(CITATION, (whole, rawLinkpath: string) => {
		const marker = markerByLinkpath.get(rawLinkpath.trim());
		return marker ? `[${marker}]` : whole;
	});

	return { text, bibliography };
}
