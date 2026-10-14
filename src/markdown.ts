/**
 * Converts a note to plain markdown — no pandoc involved, unlike every
 * other export target in this package. Pandoc's markdown writer round-trips
 * this project's pandoc-facing syntax (fenced divs, raw `{=latex}` spans,
 * doubly-escaped attribute strings) faithfully, which is exactly the
 * problem: none of that is *plain* markdown. This instead works directly
 * off the note's own syntax, doing only what a plain-markdown reader
 * actually needs:
 *
 * - `&[[Source]]` citations become a native Markdown footnote reference
 *   `[^marker]`, with a matching `[^marker]: ...` definition collected at
 *   the end of the document, instead of a raw `\cite{}` span (see
 *   `markdownCitations.ts`).
 * - The `∎` block terminator and `` `...`{=latex} `` wrapper syntax are
 *   stripped — meaningless outside this project's own pipeline.
 * - Plain `[[wikilinks]]` (not `&[[citations]]`) become their display text —
 *   a knowledge-graph link between notes has no meaning to a standalone
 *   file.
 * - Every `macros:` invocation (`\pa`, `\vol`, ...) is expanded inline to
 *   its definition, so the math is self-contained.
 * - Theorem-like headers and labelled equations are stamped with their
 *   resolved number, and every `[#label]`/`[@eq:label]` reference is
 *   replaced with that number — there's no LaTeX compiler downstream to
 *   resolve a `\ref{}` here.
 * - Frontmatter is trimmed to `title`/`author`/`date` — the rest
 *   (`preamble`, `theorems`, LaTeX layout knobs, ...) has no meaning here.
 *
 * - Obsidian callouts for a declared environment (`> [!lemma] ...`) become
 *   bold-statement blocks, so they're numbered too; any other callout stays
 *   a blockquote with its `[!type]` marker turned into a bold title.
 *
 * Bold-statement headers, `$$...$$` math, and `\begin{align}` are left
 * exactly as written: already valid, readable markdown, nothing to do.
 *
 * This module has no optional dependency on a pandoc backend at all — it's
 * the one export target that works with nothing installed beyond this
 * package itself.
 */
import { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import { convertCallouts } from "./latex/calloutBlocks";
import { expandMacros, parseMacros } from "./latex/macroExpansion";
import { collapseBlankLines, stripEnvironmentEndMarks, unwrapRawLatexSpans } from "./latex/markdownNormalizer";
import { type TheoremSpec, resolveNumbering } from "./latex/markdownNumbering";
import { collectEnvironmentTriggers } from "./latex/theoremEnvironments";
import { stripWikilinks } from "./latex/wikilinks";
import { expandCitationsForMarkdown } from "./markdownCitations";
import { resolveFrontmatterReferences } from "./frontmatterRefs";
import type { NoteRef, NoteReader } from "./notes";

const ESSENTIAL_FRONTMATTER_FIELDS = ["title", "author", "date"] as const;

/** Converts `note`'s raw text to plain markdown, returning the exported content (the caller decides where, if anywhere, to write it). */
export async function exportNoteToMarkdown(reader: NoteReader, note: NoteRef, rawText: string): Promise<string> {
	const resolved = await resolveFrontmatterReferences(reader, note, rawText);
	const { text: withCitations, bibliography } = await expandCitationsForMarkdown(reader, note, resolved);

	const body = collapseBlankLines(stripEnvironmentEndMarks(unwrapRawLatexSpans(withCitations)));

	const info = getFrontmatterInfo(body);
	const frontmatter = info.exists ? parseFrontmatter(info.frontmatter) : {};
	const macros = typeof frontmatter["macros"] === "string" ? (frontmatter["macros"] as string).trim() : "";
	const theorems = Array.isArray(frontmatter["theorems"]) ? (frontmatter["theorems"] as TheoremSpec[]) : [];
	const numberwithin = typeof frontmatter["numberwithin"] === "string" ? frontmatter["numberwithin"] : "section";
	const essentialFrontmatter: Record<string, unknown> = {};
	for (const key of ESSENTIAL_FRONTMATTER_FIELDS) {
		if (key in frontmatter) {
			essentialFrontmatter[key] = frontmatter[key];
		}
	}

	let restBody = stripWikilinks((info.exists ? body.slice(info.contentStart) : body).trim());
	// Callouts become bold-statement blocks so they're numbered like any
	// other theorem-like block; their `∎` is stripped again right after.
	restBody = collapseBlankLines(stripEnvironmentEndMarks(convertCallouts(restBody, collectEnvironmentTriggers(frontmatter))));
	restBody = expandMacros(restBody, parseMacros(macros));
	restBody = resolveNumbering(restBody, theorems, numberwithin);

	const parts: string[] = [];
	if (Object.keys(essentialFrontmatter).length > 0) {
		parts.push("---\n" + stringifyFrontmatter(essentialFrontmatter) + "---");
	}
	parts.push(restBody);
	if (bibliography.length > 0) {
		parts.push(bibliography.join("\n\n"));
	}

	return parts.join("\n\n") + "\n";
}
