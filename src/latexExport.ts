import { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import { preprocessNoteForLatex } from "./latexPreprocess";
import type { NoteRef, NoteReader } from "./notes";
import type { PandocBackend } from "./pandoc/types";
import { extractRawLatexFrontmatter } from "./rawLatexFrontmatter";

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
