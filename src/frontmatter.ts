/**
 * Obsidian-free stand-ins for `obsidian`'s `getFrontMatterInfo`/`parseYaml`/
 * `stringifyYaml`, which the export pipeline used purely as YAML-frontmatter
 * utilities with no actual vault dependency. Backed by `js-yaml` instead.
 */
import { load, dump } from "js-yaml";

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export interface FrontmatterInfo {
	exists: boolean;
	/** The raw YAML text between the `---` fences, empty if `exists` is false. */
	frontmatter: string;
	/** Index into the original string where the body starts (right after the closing fence, or 0 if `exists` is false). */
	contentStart: number;
}

/** Splits `content`'s leading `---\n...\n---\n` frontmatter block from its body, without parsing the YAML. */
export function getFrontmatterInfo(content: string): FrontmatterInfo {
	const match = FRONTMATTER_BLOCK.exec(content);
	if (!match) {
		return { exists: false, frontmatter: "", contentStart: 0 };
	}
	return { exists: true, frontmatter: match[1], contentStart: match[0].length };
}

export function parseFrontmatter(raw: string): Record<string, unknown> {
	return (load(raw) as Record<string, unknown>) ?? {};
}

export function stringifyFrontmatter(data: Record<string, unknown>): string {
	return dump(data);
}
