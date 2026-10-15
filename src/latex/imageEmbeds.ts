/**
 * Turns Obsidian image embeds into standard Markdown images pandoc can
 * typeset:
 *
 *   ![[plot.png]]               ->  ![](<../attachments/plot.png>)
 *   ![[plot.png|300]]           ->  ![](<../attachments/plot.png>){width=300px}
 *   ![[plot.png|300x200]]       ->  ![](<...>){width=300px height=200px}
 *   ![[plot.png|A caption]]     ->  ![A caption](<...>)
 *
 * Obsidian resolves an embed by file name anywhere in the vault (typically
 * an attachments folder), while LaTeX resolves `\includegraphics` paths
 * relative to the directory it compiles in — so each embed is resolved
 * like Obsidian does (`reader.resolveLink`) and rewritten as a path
 * relative to `outputDir` (the exported note's folder, or a project's
 * master folder). An embed that doesn't resolve keeps its path as written,
 * so LaTeX reports the missing file by name.
 *
 * Runs before `stripWikilinks`, which would otherwise reduce the embed to
 * a literal `!plot.png`. Embeds of other notes (`![[Note]]`) are left to
 * that pass.
 */
import type { NoteRef, NoteReader } from "../notes";

const IMAGE_EMBED = /!\[\[([^\]|#]+\.(?:png|jpe?g|gif|bmp|svg|webp|avif|pdf))(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/gi;
const SIZE = /^\s*(\d+)(?:\s*x\s*(\d+))?\s*$/;

export function convertImageEmbeds(text: string, reader: NoteReader, from: NoteRef, outputDir: string): string {
	return text.replace(IMAGE_EMBED, (_whole, linkpath: string, option: string | undefined) => {
		const target = reader.resolveLink(from, linkpath.trim());
		const path = target ? relativePath(outputDir, target.path) : linkpath.trim();

		const size = option !== undefined ? SIZE.exec(option) : null;
		const caption = option !== undefined && !size ? option.trim() : "";
		const attrs = size ? `{width=${size[1]}px${size[2] ? ` height=${size[2]}px` : ""}}` : "";
		return `![${caption}](<${path}>)${attrs}`;
	});
}

/** The folder a vault path lives in ("" for the vault root). */
export function folderOf(path: string): string {
	const idx = path.lastIndexOf("/");
	return idx === -1 ? "" : path.slice(0, idx);
}

/** POSIX `path.relative` for vault paths, without depending on node's `path` (this also runs on mobile). */
function relativePath(fromDir: string, to: string): string {
	const fromParts = fromDir.split("/").filter(Boolean);
	const toParts = to.split("/").filter(Boolean);
	let common = 0;
	while (common < fromParts.length && common < toParts.length - 1 && fromParts[common] === toParts[common]) {
		common++;
	}
	return [...fromParts.slice(common).map(() => ".."), ...toParts.slice(common)].join("/");
}
