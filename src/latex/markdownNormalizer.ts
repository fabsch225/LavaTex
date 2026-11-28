/**
 * Cleanup passes for the plain-markdown export, applied to the note body
 * after citations are resolved. Each strips syntax that only means
 * something to this plugin's own pipeline, so what's left reads as
 * ordinary markdown wherever it ends up (GitHub, another note, a chat
 * message, ...) rather than a pandoc round-trip's fenced divs and raw
 * `{=latex}` passthrough noise.
 */

const ENVIRONMENT_END_MARK_LINE = /^∎[ \t]*\n?/gm;

/** Removes the "∎" bold-statement-block terminator — meaningless outside this plugin's own preprocessing. */
export function stripEnvironmentEndMarks(text: string): string {
	return text.replace(ENVIRONMENT_END_MARK_LINE, "");
}

const RAW_LATEX_BLOCK = /```\{=latex\}\n([\s\S]*?)```\n?/g;
const RAW_LATEX_INLINE = /`([^`\n]+)`\{=latex\}/g;

/**
 * Unwraps pandoc's raw-LaTeX-passthrough syntax to bare text. There's no
 * plain-markdown equivalent for the LaTeX itself (a local `\newcommand`, a
 * `\qed`), but the backtick/fence wrapper is still just noise once nothing
 * downstream is going to interpret the `{=latex}` tag.
 */
export function unwrapRawLatexSpans(text: string): string {
	return text
		.replace(RAW_LATEX_BLOCK, (_match, content: string) => content.trimEnd() + "\n")
		.replace(RAW_LATEX_INLINE, "$1");
}

/** Collapses runs of 3+ newlines (left behind by the removals above) down to a single blank line. */
export function collapseBlankLines(text: string): string {
	return text.replace(/\n{3,}/g, "\n\n");
}

const FENCE = /^[ \t]*(?:>[ \t]?)*[ \t]*(```|~~~)/;
// Blockquote/callout markers, indentation and a list marker a line's content sits behind.
const LINE_PREFIX = /^((?:[ \t]*>)*[ \t]*)((?:[-*+]|\d+[.)])[ \t]+)?/;
const TRAILING_LABEL = /^\{#[\w:-]+\}$/;

/**
 * Puts every `$$` display-math delimiter on a line of its own, so
 * `$$x = y$$` and `text $$x$$ text` read as a fenced math block:
 *
 *   $$
 *   x = y
 *   $$
 *
 * A trailing `{#eq:label}` stays on the closing `$$` line (where the
 * numbering pass looks for it); a blockquote's `>` prefix is repeated on
 * every line split off, and a list item's math stays indented under it. Code fences, inline code and `\$$` are left alone.
 */
export function splitDisplayMath(text: string): string {
	const out: string[] = [];
	let fence: string | null = null;
	for (const line of text.split("\n")) {
		const fenceMatch = FENCE.exec(line);
		if (fenceMatch && (fence === null || fenceMatch[1] === fence)) {
			fence = fence === null ? fenceMatch[1] : null;
			out.push(line);
			continue;
		}
		if (fence !== null) {
			out.push(line);
			continue;
		}
		const prefixMatch = LINE_PREFIX.exec(line)!;
		const prefix = prefixMatch[0];
		const parts = splitOnDelimiters(line.slice(prefix.length));
		if (parts.length === 1 || (parts.length === 2 && parts.every((p) => p.trim() === ""))) {
			out.push(line);
			continue;
		}
		const pieces: string[] = [];
		parts.forEach((part, i) => {
			if (i > 0) pieces.push("$$");
			const trimmed = part.trim();
			if (trimmed === "") return;
			if (i > 0 && i === parts.length - 1 && TRAILING_LABEL.test(trimmed)) {
				pieces[pieces.length - 1] += " " + trimmed;
				return;
			}
			pieces.push(i === 0 ? part.trimEnd() : trimmed);
		});
		// Split-off lines repeat a `>` prefix (with a space) and indentation,
		// and sit under a list item's content rather than repeating its marker.
		const base = prefixMatch[1].includes(">") ? prefixMatch[1].replace(/[ \t]*$/, " ") : prefixMatch[1];
		const continuation = base + " ".repeat(prefixMatch[2]?.length ?? 0);
		pieces.forEach((piece, i) => out.push(i === 0 ? prefix + piece.trimStart() : continuation + piece));
	}
	return out.join("\n");
}

/** `content` split at every `$$` outside inline code and not escaped as `\$`. */
function splitOnDelimiters(content: string): string[] {
	const parts: string[] = [];
	let start = 0;
	let inCode = false;
	for (let i = 0; i < content.length; i++) {
		const c = content[i];
		if (c === "\\") {
			i++;
		} else if (c === "`") {
			inCode = !inCode;
		} else if (!inCode && c === "$" && content[i + 1] === "$") {
			parts.push(content.slice(start, i));
			start = i + 2;
			i++;
		}
	}
	parts.push(content.slice(start));
	return parts;
}
