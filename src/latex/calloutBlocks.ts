/**
 * Obsidian callouts as an alternative spelling of the bold-statement
 * theorem blocks (see `theoremBlockPreprocessor.ts`):
 *
 *   > [!task] Problem Statement {#task-holo}
 *   > Let $X$ be a Riemann surface ...
 *
 * becomes
 *
 *   **task** (Problem Statement) {#task-holo}
 *   Let $X$ be a Riemann surface ...
 *   ∎
 *
 * so everything downstream — environment lookup, numbering, labels,
 * nesting — is exactly the bold-statement path. The callout type matches a
 * `theorems[].name`/`proofname` (the bold-statement trigger words) or a
 * `theorems[].id`, case-insensitively; the callout title, if any, becomes
 * the environment's title; a `+`/`-` fold marker is ignored. Callouts nest
 * the usual way (`> > [!proof]`).
 *
 * A callout whose type isn't a theorem-like environment (a plain `[!info]`
 * aside) becomes a LaTeX environment named after its type — `\begin{info}
 * [Title] ... \end{info}` — through the same bold-statement path, with the
 * reserved trigger `**callout:info**`. `theorems.lua` supplies a plain
 * fallback definition for any type the preamble doesn't define, so a note
 * restyles a callout type by defining that environment itself. For
 * Markdown export (`unknown: "blockquote"`), it is kept as a blockquote
 * instead, the `[!type]` marker — meaningless outside Obsidian — replaced
 * by its title in bold.
 */

/** Trigger-word prefix marking a non-theorem callout for `preprocessTheoremBlocks`. */
export const CALLOUT_TRIGGER_PREFIX = "callout:";

export interface CalloutOptions {
	/** What a callout that isn't a theorem-like environment becomes. */
	unknown?: "environment" | "blockquote";
}

const CALLOUT_HEADER = /^\[!([\w-]+)\][+-]?[ \t]*(.*)$/;
const QUOTE_PREFIX = /^[ \t]{0,3}>[ \t]?/;
const FENCE = /^[ \t]*(```|~~~)/;
const LABEL_SUFFIX = /\s*\{#([\w:-]+)\}\s*$/;

export function convertCallouts(text: string, triggers: ReadonlyMap<string, string>, options: CalloutOptions = {}): string {
	return convertLines(text.split("\n"), triggers, options.unknown ?? "environment").join("\n");
}

function convertLines(lines: string[], triggers: ReadonlyMap<string, string>, unknown: "environment" | "blockquote"): string[] {
	const out: string[] = [];
	let fence: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const fenceMatch = FENCE.exec(line);
		if (fenceMatch && (fence === null || fenceMatch[1] === fence)) {
			fence = fence === null ? fenceMatch[1] : null;
			out.push(line);
			continue;
		}
		if (fence !== null || !QUOTE_PREFIX.test(line)) {
			out.push(line);
			continue;
		}

		const header = CALLOUT_HEADER.exec(line.replace(QUOTE_PREFIX, ""));
		if (!header) {
			out.push(line);
			continue;
		}

		const body: string[] = [];
		while (i + 1 < lines.length && QUOTE_PREFIX.test(lines[i + 1])) {
			body.push(lines[++i].replace(QUOTE_PREFIX, ""));
		}
		const convertedBody = convertLines(body, triggers, unknown);

		let title = header[2].trim();
		let label = "";
		const labelMatch = LABEL_SUFFIX.exec(title);
		if (labelMatch) {
			label = labelMatch[1];
			title = title.slice(0, labelMatch.index);
		}

		const triggerWord =
			triggerWordFor(header[1], triggers) ?? (unknown === "environment" ? CALLOUT_TRIGGER_PREFIX + header[1].toLowerCase() : null);
		if (triggerWord) {
			const parts = [`**${triggerWord}**`, title && `(${title})`, label && `{#${label}}`];
			out.push(parts.filter(Boolean).join(" "), ...convertedBody, "∎");
		} else {
			const heading = title || capitalize(header[1]);
			out.push(`> **${heading}**${label ? ` {#${label}}` : ""}`, ...convertedBody.map((l) => (l ? `> ${l}` : ">")));
		}
	}

	return out;
}

/** The bold-statement trigger word that opens `type`'s environment, or null if `type` is no environment. */
function triggerWordFor(type: string, triggers: ReadonlyMap<string, string>): string | null {
	const normalized = type.toLowerCase();
	if (triggers.has(normalized)) {
		return normalized;
	}
	for (const [word, id] of triggers) {
		if (id.toLowerCase() === normalized) {
			return word;
		}
	}
	return null;
}

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}
