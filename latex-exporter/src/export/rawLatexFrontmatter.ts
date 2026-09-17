import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

/**
 * Pulls `preamble:`/`macros:`/`bibliography-raw:` out of an already-resolved
 * frontmatter object (wikilinks and citations already expanded into literal
 * strings by this point) so they can be handed to pandoc via
 * `--include-in-header`/`--include-after-body` instead of a template
 * variable — see `pandoc.ts` for why: pandoc markdown-parses YAML metadata
 * string values, and its raw-LaTeX passthrough only recognizes a curated set
 * of common macros, silently corrupting anything else (a custom
 * `\newtheoremstyle`, a multi-line `\lstdefinestyle`, ...).
 */
export interface ExtractedRawLatex {
	/** The frontmatter object with `preamble`/`macros`/`bibliography-raw` removed. */
	frontmatter: Record<string, unknown>;
	/** `preamble` + `macros`, concatenated — goes to `--include-in-header`. */
	headerIncludes: string;
	/** `bibliography-raw` — goes to `--include-after-body`. */
	afterBody: string;
}

function takeString(frontmatter: Record<string, unknown>, key: string): string {
	const value = frontmatter[key];
	delete frontmatter[key];
	return typeof value === "string" ? value.trim() : "";
}

export function extractRawLatexFrontmatter(frontmatter: Record<string, unknown>): ExtractedRawLatex {
	const preamble = takeString(frontmatter, "preamble");
	const macros = takeString(frontmatter, "macros");
	const afterBody = takeString(frontmatter, "bibliography-raw");

	const headerIncludes = [preamble, macros].filter(Boolean).join("\n\n");

	return { frontmatter, headerIncludes, afterBody };
}

/** Writes `content` to a fresh temp file pandoc can `--include-*` from, or returns undefined if it's empty. */
export async function writeRawLatexInclude(content: string, tag: string): Promise<string | undefined> {
	if (!content) return undefined;
	const filePath = path.join(os.tmpdir(), `latex-exporter-${tag}-${process.pid}-${Date.now()}.tex`);
	await fs.writeFile(filePath, content, "utf8");
	return filePath;
}
