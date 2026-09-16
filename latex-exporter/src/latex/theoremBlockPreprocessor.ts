/**
 * Translates plain bold-statement theorem blocks into the pandoc fenced-div
 * syntax `pandoc/theorems.lua` turns into amsthm environments.
 *
 * Callouts (the previous approach) required every line to carry a `>`
 * prefix, which was painful to edit — multi-line math and copy/paste both
 * fight the quote markers. This instead mirrors how theorems are actually
 * typeset in a paper: a bold label starts the statement, an end-of-proof
 * style mark ends it:
 *
 *   **Theorem** (Weierstraßsche $\varphi$-Funktion; \kk S.35) {#thm-weier}
 *   Die Reihe
 *   $$
 *   \varphi(z) := ...
 *   $$
 *   konvergiert ... die Weierstraßsche $\varphi$-Funktion.
 *   ∎
 *
 * becomes:
 *
 *   ::: {.theorem title="Weierstraßsche $\varphi$-Funktion; \kk S.35" #thm-weier}
 *   Die Reihe
 *   ...
 *   :::
 *
 * `**Word**` only starts a block when `Word` (trailing period stripped,
 * case-insensitive) is a known trigger — see `theoremEnvironments.ts` — so
 * ordinary bold text elsewhere in a note is left alone. Blocks nest by
 * stacking: a new header inside an open block starts a nested environment,
 * and each `∎` closes the innermost still-open one.
 */

const TERMINATOR = "∎";

/**
 * Fenced divs nest by fence length: pandoc closes a div at the first fence
 * line at least as long as its opener, so an outer div's fence must be
 * longer than anything nested inside it. Since blocks are matched with a
 * single forward pass (no lookahead for how deep nesting will go), fence
 * length simply counts down from a generously large base as depth
 * increases — comfortably covering any nesting this system will ever see.
 */
const BASE_FENCE_LENGTH = 20;

export function preprocessTheoremBlocks(text: string, triggers: ReadonlyMap<string, string>): string {
	const lines = text.split("\n");
	const out: string[] = [];
	const openFences: number[] = [];

	for (const line of lines) {
		const header = parseHeader(line, triggers);
		if (header) {
			const fenceLength = Math.max(3, BASE_FENCE_LENGTH - openFences.length);
			openFences.push(fenceLength);

			const attrs = [`.${header.id}`, header.title && `title="${escapeAttr(header.title)}"`, header.label && `#${header.label}`]
				.filter(Boolean)
				.join(" ");
			out.push(`${":".repeat(fenceLength)} {${attrs}}`);
			if (header.rest) out.push(header.rest);
			continue;
		}

		if (line.trim() === TERMINATOR && openFences.length > 0) {
			out.push(":".repeat(openFences.pop()!));
			continue;
		}

		out.push(line);
	}

	// Any block still open at EOF is a user error (missing ∎); close it
	// anyway so pandoc gets valid input instead of silently losing content.
	while (openFences.length > 0) {
		out.push(":".repeat(openFences.pop()!));
	}

	return out.join("\n");
}

interface BlockHeader {
	id: string;
	title: string;
	label: string;
	/** Any body text that followed the header on the same line. */
	rest: string;
}

function parseHeader(line: string, triggers: ReadonlyMap<string, string>): BlockHeader | null {
	if (!line.startsWith("**")) {
		return null;
	}
	const closeIdx = line.indexOf("**", 2);
	if (closeIdx === -1) {
		return null;
	}

	const trigger = line
		.slice(2, closeIdx)
		.trim()
		.replace(/\.$/, "")
		.toLowerCase();
	const id = triggers.get(trigger);
	if (!id) {
		return null;
	}

	let rest = line.slice(closeIdx + 2).trimStart();
	let title = "";
	if (rest.startsWith("(")) {
		const end = rest.indexOf(")");
		if (end !== -1) {
			title = rest.slice(1, end);
			rest = rest.slice(end + 1).trimStart();
		}
	}

	let label = "";
	if (rest.startsWith("{#")) {
		const end = rest.indexOf("}");
		if (end !== -1) {
			label = rest.slice(2, end).trim();
			rest = rest.slice(end + 1).trimStart();
		}
	}

	if (rest.startsWith(".")) {
		rest = rest.slice(1).trimStart();
	}

	return { id, title, label, rest };
}

function escapeAttr(value: string): string {
	return value.replace(/"/g, '\\"');
}
