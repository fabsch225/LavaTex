import { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import { preprocessNoteForLatex } from "./latexPreprocess";
import type { NoteRef, NoteReader } from "./notes";
import type { PandocBackend } from "./pandoc/types";
import { extractRawLatexFrontmatter } from "./rawLatexFrontmatter";
import { withTikzPreamble } from "./latex/tikzBlocks";

/** The LaTeX template and Lua filter a `PandocBackend` needs — see `latex-exporter/pandoc/` for LavaTex's own. */
export interface LatexAssets {
	template: string;
	luaFilter: string;
}

/** Converts one note to a complete `.tex` document via `backend`. The caller decides where, if anywhere, to write the result. */
export async function exportNoteToLatex(
	reader: NoteReader,
	note: NoteRef,
	rawText: string,
	backend: PandocBackend,
	assets: LatexAssets,
	cwd?: string,
): Promise<string> {
	const preprocessed = await preprocessNoteForLatex(reader, note, rawText);

	const info = getFrontmatterInfo(preprocessed);
	const frontmatter = info.exists ? parseFrontmatter(info.frontmatter) : {};

	// `chapters:` is also a reserved pandoc-crossref metadata key (a boolean,
	// "number figures per chapter") — our own `chapters:` (a list of chapter
	// notes) is only ever stripped on the *project* export path. Sent through
	// here instead, it survives into pandoc's metadata verbatim and
	// pandoc-crossref crashes on the type mismatch with an opaque Haskell
	// exception. Catch the mistake here instead, with an actionable message.
	if (Array.isArray(frontmatter["chapters"])) {
		throw new Error("This note has a `chapters:` list — use `exportProjectToLatex` instead.");
	}

	// From the raw note, before preprocessing turns tikz blocks into raw LaTeX.
	const rawInfo = getFrontmatterInfo(rawText);
	const rawBody = rawInfo.exists ? rawText.slice(rawInfo.contentStart) : rawText;
	withTikzPreamble(frontmatter, rawBody);
	if (!hasHeadings(rawBody)) {
		numberWithoutSections(frontmatter);
	}

	const { frontmatter: strippedFrontmatter, headerIncludes, afterBody } = extractRawLatexFrontmatter(frontmatter);
	const finalText = info.exists
		? "---\n" + stringifyFrontmatter(strippedFrontmatter) + "---\n" + preprocessed.slice(info.contentStart)
		: preprocessed;

	return backend.convert({
		markdown: finalText,
		template: assets.template,
		luaFilter: assets.luaFilter,
		headerIncludes,
		afterBody,
		cwd,
	});
}

const FENCED_BLOCK = /^(```|~~~)[\s\S]*?^\1[ \t]*$/gm;

/** Whether the note body has any `#` heading (code blocks, whose `# comments` aren't headings, excluded). */
function hasHeadings(body: string): boolean {
	return /^#{1,6}[ \t]+\S/m.test(body.replace(FENCED_BLOCK, ""));
}

/**
 * A note without headings has no sections to number within, so
 * `counter: section` would make every theorem "0.1", "0.2", ... and every
 * equation "(0.1)". Number them plainly instead: drop such counters (an
 * entry with neither `counter` nor `like` gets its own plain counter) and,
 * unless the note set `numberwithin:` itself, tell the template to leave
 * the equation counter alone.
 */
function numberWithoutSections(frontmatter: Record<string, unknown>): void {
	const theorems = frontmatter["theorems"];
	if (Array.isArray(theorems)) {
		frontmatter["theorems"] = theorems.map((spec) => {
			if (!spec || typeof spec !== "object") return spec;
			const { counter, ...rest } = spec as Record<string, unknown>;
			return counter === "section" || counter === "subsection" || counter === "subsubsection" ? rest : spec;
		});
	}
	if (!("numberwithin" in frontmatter)) {
		frontmatter["nosections"] = true;
	}
}
