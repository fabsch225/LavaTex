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
import { type App, type TFile, getFrontMatterInfo, parseYaml, stringifyYaml } from "obsidian";

import { readNote, resolveLinkpath } from "./frontmatterRefs";

const CITATION = /&\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

export async function expandCitations(app: App, sourceFile: TFile, rawText: string): Promise<string> {
	const matches = [...rawText.matchAll(CITATION)];
	if (matches.length === 0) {
		return rawText;
	}

	const keyByLinkpath = new Map<string, string>();
	const bibitemsByKey = new Map<string, string>();

	for (const match of matches) {
		const linkpath = match[1].trim();
		if (keyByLinkpath.has(linkpath)) {
			continue;
		}
		const target = resolveLinkpath(app, sourceFile, linkpath);
		if (!target) {
			continue;
		}
		const { frontmatter } = await readNote(app, target);
		const key = typeof frontmatter["key"] === "string" ? (frontmatter["key"] as string) : target.basename;
		keyByLinkpath.set(linkpath, key);
		if (typeof frontmatter["bibitem"] === "string") {
			bibitemsByKey.set(key, (frontmatter["bibitem"] as string).trim());
		}
	}

	let text = rawText.replace(CITATION, (whole, rawLinkpath: string) => {
		const key = keyByLinkpath.get(rawLinkpath.trim());
		return key ? "`\\cite{" + key + "}`{=latex}" : whole;
	});

	if (bibitemsByKey.size === 0) {
		return text;
	}

	const info = getFrontMatterInfo(text);
	const frontmatter = (info.exists ? (parseYaml(info.frontmatter) as Record<string, unknown>) : undefined) ?? {};
	frontmatter["bibliography-raw"] =
		"\\begin{thebibliography}{9}\n" + [...bibitemsByKey.values()].join("\n\n") + "\n\\end{thebibliography}";

	return "---\n" + stringifyYaml(frontmatter) + "---\n" + text.slice(info.contentStart);
}
