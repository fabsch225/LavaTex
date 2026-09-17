/**
 * Orchestrates a single note's export: read it, run the note-syntax ->
 * pandoc-syntax preprocessing passes, hand the result to pandoc, clean up.
 *
 * Each preprocessing step lives in its own module under `../latex/` (pure
 * text transforms, order mostly irrelevant since each targets disjoint
 * syntax) so this file stays a thin sequence of calls, not a place where
 * unrelated concerns accumulate.
 */
import { type App, type TFile, getFrontMatterInfo, parseYaml, stringifyYaml } from "obsidian";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

import { collectEnvironmentTriggers } from "../latex/theoremEnvironments";
import { preprocessTheoremBlocks } from "../latex/theoremBlockPreprocessor";
import { convertAlignBlocksToRaw } from "../latex/rawEnvironments";
import { expandReferenceShortcuts } from "../latex/referenceShortcuts";
import { collapseBlankLines, stripEnvironmentEndMarks, unwrapRawLatexSpans } from "../latex/markdownNormalizer";
import { expandCitations } from "./citations";
import { resolveFrontmatterReferences } from "./frontmatterRefs";
import { compileToPdf, openInDefaultApp } from "./latex";
import { expandCitationsForMarkdown } from "./markdownCitations";
import { runPandoc } from "./pandoc";
import { pluginDir, vaultBasePath } from "./paths";

/** Runs every note-syntax -> pandoc-syntax preprocessing pass, shared by every export target. */
async function preprocessNote(app: App, file: TFile): Promise<string> {
	let raw = await resolveFrontmatterReferences(app, file, await app.vault.read(file));
	raw = await expandCitations(app, file, raw);
	const frontmatterInfo = getFrontMatterInfo(raw);
	const frontmatter = frontmatterInfo.exists
		? (parseYaml(frontmatterInfo.frontmatter) as Record<string, unknown>)
		: undefined;
	const triggers = collectEnvironmentTriggers(frontmatter);

	return expandReferenceShortcuts(preprocessTheoremBlocks(convertAlignBlocksToRaw(raw), triggers));
}

export async function exportNoteToLatex(app: App, file: TFile, pluginId: string): Promise<string> {
	const preprocessed = await preprocessNote(app, file);

	const base = vaultBasePath(app);
	const dir = pluginDir(app, pluginId);
	const outputPath = path.join(base, file.parent?.path ?? "", `${file.basename}.tex`);
	const tmpInputPath = path.join(os.tmpdir(), `latex-exporter-${process.pid}-${Date.now()}.md`);

	await fs.writeFile(tmpInputPath, preprocessed, "utf8");
	try {
		await runPandoc({
			inputPath: tmpInputPath,
			outputPath,
			templatePath: path.join(dir, "pandoc", "template.latex"),
			luaFilterPath: path.join(dir, "pandoc", "theorems.lua"),
			cwd: path.dirname(path.join(base, file.path)),
		});
	} finally {
		await fs.rm(tmpInputPath, { force: true });
	}

	return outputPath;
}

/** Exports the note to LaTeX, compiles it to PDF, and opens the result. */
export async function exportNoteToPdf(app: App, file: TFile, pluginId: string): Promise<string> {
	const texPath = await exportNoteToLatex(app, file, pluginId);
	const pdfPath = await compileToPdf({
		texPath,
		cwd: path.dirname(texPath),
	});
	await openInDefaultApp(pdfPath);
	return pdfPath;
}

const ESSENTIAL_FRONTMATTER_FIELDS = ["title", "author", "date"] as const;

/**
 * Exports the note to plain markdown — no pandoc involved, unlike every
 * other export target. Pandoc's markdown writer round-trips this plugin's
 * pandoc-facing syntax (fenced divs, raw `{=latex}` spans, doubly-escaped
 * attribute strings) faithfully, which is exactly the problem: none of that
 * is *plain* markdown. This instead works directly off the note's own
 * syntax, doing only what a plain-markdown reader actually needs:
 *
 * - `&[[Source]]` citations become a readable `[marker]` plus a generated
 *   bibliography section, instead of a raw `\cite{}` span (see
 *   `markdownCitations.ts`).
 * - The `∎` block terminator and `` `...`{=latex} `` wrapper syntax are
 *   stripped — meaningless outside this plugin's own pipeline.
 * - The `macros:` field (if any) is inserted as a math block near the top,
 *   so the custom commands it defines are visible instead of silently
 *   dropped (frontmatter is otherwise invisible to anything reading plain
 *   markdown).
 * - Frontmatter is trimmed to `title`/`author`/`date` — the rest
 *   (`preamble`, `theorems`, LaTeX layout knobs, ...) has no meaning here.
 *
 * Bold-statement headers, `$$...$$` math, and `\begin{align}` are left
 * exactly as written: already valid, readable markdown, nothing to do.
 */
export async function exportNoteToMarkdown(app: App, file: TFile): Promise<string> {
	const raw = await resolveFrontmatterReferences(app, file, await app.vault.read(file));
	const { text: withCitations, bibliography } = await expandCitationsForMarkdown(app, file, raw);

	const body = collapseBlankLines(stripEnvironmentEndMarks(unwrapRawLatexSpans(withCitations)));

	const info = getFrontMatterInfo(body);
	const frontmatter = info.exists ? ((parseYaml(info.frontmatter) as Record<string, unknown>) ?? {}) : {};
	const macros = typeof frontmatter["macros"] === "string" ? (frontmatter["macros"] as string).trim() : "";
	const essentialFrontmatter: Record<string, unknown> = {};
	for (const key of ESSENTIAL_FRONTMATTER_FIELDS) {
		if (key in frontmatter) {
			essentialFrontmatter[key] = frontmatter[key];
		}
	}
	const restBody = (info.exists ? body.slice(info.contentStart) : body).trim();

	const parts: string[] = [];
	if (Object.keys(essentialFrontmatter).length > 0) {
		parts.push("---\n" + stringifyYaml(essentialFrontmatter) + "---");
	}
	if (macros) {
		parts.push("$$\n" + macros + "\n$$");
	}
	parts.push(restBody);
	if (bibliography.length > 0) {
		parts.push("## Bibliography\n\n" + bibliography.join("\n\n"));
	}

	const base = vaultBasePath(app);
	const outputPath = path.join(base, file.parent?.path ?? "", `${file.basename}.exported.md`);
	await fs.writeFile(outputPath, parts.join("\n\n") + "\n", "utf8");

	return outputPath;
}
