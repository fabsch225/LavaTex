/**
 * Fenced blocks inside a blockquote or callout (` > ```tikz `, nested
 * ` > > ```python `) carry a `>` prefix on every line, so the line-start
 * fence regexes in `tikzBlocks.ts`/`codeBlocks.ts` don't see them and pandoc
 * gets them as ordinary highlighted code (`\begin{Shaded}`, undefined in our
 * template). This finds each such quoted fence, strips its quote prefix,
 * runs `convert` on the bare block and puts the prefix back on every line of
 * the result, so the callout pass downstream still sees one quoted block.
 */

const QUOTE_PREFIX = /^((?:[ \t]{0,3}>[ \t]?)+)/;
const OPEN_FENCE = /^```/;

function quoteDepth(prefix: string): number {
	return (prefix.match(/>/g) ?? []).length;
}

/** Strips exactly `depth` levels of `>` from `line`, or returns null if it has fewer. */
function unquote(line: string, depth: number): string | null {
	let rest = line;
	for (let d = 0; d < depth; d++) {
		const m = /^[ \t]{0,3}>[ \t]?/.exec(rest);
		if (!m) return null;
		rest = rest.slice(m[0].length);
	}
	return rest;
}

export function mapQuotedFences(text: string, convert: (block: string) => string): string {
	const lines = text.split("\n");
	const out: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const prefixMatch = QUOTE_PREFIX.exec(line);
		const depth = prefixMatch ? quoteDepth(prefixMatch[1]) : 0;
		const opener = depth > 0 ? unquote(line, depth) : null;
		if (opener === null || !OPEN_FENCE.test(opener)) {
			out.push(line);
			continue;
		}

		const block = [opener];
		let j = i + 1;
		let closed = false;
		for (; j < lines.length; j++) {
			const inner = unquote(lines[j], depth);
			if (inner === null) break;
			block.push(inner);
			if (/^```[ \t]*\r?$/.test(inner)) {
				closed = true;
				break;
			}
		}
		if (!closed) {
			out.push(line);
			continue;
		}

		const prefix = "> ".repeat(depth);
		for (const converted of convert(block.join("\n")).split("\n")) {
			out.push(converted ? prefix + converted : prefix.trimEnd());
		}
		i = j;
	}
	return out.join("\n");
}
