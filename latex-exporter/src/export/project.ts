/**
 * Assembles a multi-chapter document — book/report scale, e.g. a Bachelor's
 * thesis — from a "master" note's `chapters:` frontmatter: an ordered list
 * of `[[wikilinks]]` to chapter notes, each exported and preprocessed the
 * same way a standalone note would be, then concatenated into a single
 * pandoc pass. This is the multi-file counterpart to `exporter.ts`'s
 * single-note export: one shared preamble/theorem/macro/bibliography setup
 * and one `\documentclass{report}`/`{book}`, instead of a separate `.tex`
 * per chapter with no shared numbering or cross-references.
 *
 * Master note frontmatter (on top of everything a single note already
 * supports — `preamble`, `theorems`, `macros`, `title`/`author`/`date`, ...):
 *
 *   chapters:
 *     - "[[00 Motivation]]"
 *     - "[[10 Stochastic Processes]]"
 *     - "[[70 Appendix]]"
 *   documentclass: report   # or book; defaults to report
 *   division: chapter       # pandoc --top-level-division; defaults to chapter
 *   numberwithin: chapter   # \numberwithin{equation}{...}; defaults to section
 *   appendix-from: "[[70 Appendix]]"   # optional: \appendix before this chapter
 *   toc: true                          # defaults to true for project export
 *
 * The master note's own body (if any) is treated as front matter content —
 * an abstract, dedication, etc. — placed before the first chapter.
 */
import { type App, type TFile, getFrontMatterInfo, parseYaml, stringifyYaml } from "obsidian";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

import { collectEnvironmentTriggers } from "../latex/theoremEnvironments";
import { preprocessTheoremBlocks } from "../latex/theoremBlockPreprocessor";
import { convertAlignBlocksToRaw } from "../latex/rawEnvironments";
import { convertCodeBlocksToRaw } from "../latex/codeBlocks";
import { convertTikzBlocksToRaw } from "../latex/tikzBlocks";
import { expandReferenceShortcuts } from "../latex/referenceShortcuts";
import { expandCitationsAcrossFiles } from "./citations";
import { readNote, resolveFrontmatterReferences, resolveLinkpath } from "./frontmatterRefs";
import { compileToPdf, openInDefaultApp } from "./latex";
import { runPandoc } from "./pandoc";
import { extractRawLatexFrontmatter, writeRawLatexInclude } from "./rawLatexFrontmatter";
import { pluginDir, vaultBasePath } from "./paths";

const WIKILINK = /^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/;

function linkpathOf(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const match = WIKILINK.exec(value.trim());
	return match ? match[1] : undefined;
}

/** Runs the same note-syntax -> pandoc-syntax passes a standalone note gets, minus theorem/citation handling (done project-wide, once). */
function preprocessChapterBody(body: string, triggers: ReadonlyMap<string, string>): string {
	return expandReferenceShortcuts(
		preprocessTheoremBlocks(convertTikzBlocksToRaw(convertCodeBlocksToRaw(convertAlignBlocksToRaw(body))), triggers),
	);
}

export async function exportProjectToLatex(app: App, master: TFile, pluginId: string): Promise<string> {
	const masterRaw = await resolveFrontmatterReferences(app, master, await app.vault.read(master));
	const info = getFrontMatterInfo(masterRaw);
	if (!info.exists) {
		throw new Error("Master note needs frontmatter with a `chapters:` list.");
	}
	const frontmatter = (parseYaml(info.frontmatter) as Record<string, unknown>) ?? {};

	const chapterField = frontmatter["chapters"];
	if (!Array.isArray(chapterField) || chapterField.length === 0) {
		throw new Error("Master note's frontmatter needs a non-empty `chapters:` list of [[wikilinks]].");
	}

	const chapters: { file: TFile; body: string }[] = [];
	for (const entry of chapterField) {
		const linkpath = linkpathOf(entry);
		if (!linkpath) {
			throw new Error(`\`chapters:\` entry is not a [[wikilink]]: ${JSON.stringify(entry)}`);
		}
		const file = resolveLinkpath(app, master, linkpath);
		if (!file) {
			throw new Error(`Chapter link not found: [[${linkpath}]]`);
		}
		const { body } = await readNote(app, file);
		chapters.push({ file, body });
	}

	const appendixLinkpath = linkpathOf(frontmatter["appendix-from"]);
	const appendixFile = appendixLinkpath ? resolveLinkpath(app, master, appendixLinkpath) : undefined;
	if (appendixLinkpath && !appendixFile) {
		throw new Error(`\`appendix-from:\` link not found: [[${appendixLinkpath}]]`);
	}

	const { texts, bibliographyRaw } = await expandCitationsAcrossFiles(
		app,
		chapters.map((chapter) => ({ file: chapter.file, text: chapter.body })),
	);

	const triggers = collectEnvironmentTriggers(frontmatter);

	const parts: string[] = [];
	const masterBody = masterRaw.slice(info.contentStart).trim();
	if (masterBody) {
		parts.push(preprocessChapterBody(masterBody, triggers));
	}

	chapters.forEach((chapter, i) => {
		if (appendixFile && chapter.file === appendixFile) {
			parts.push("```{=latex}\n\\appendix\n```");
		}
		parts.push(preprocessChapterBody(texts[i], triggers));
	});

	if (bibliographyRaw) {
		frontmatter["bibliography-raw"] = bibliographyRaw;
	}
	if (!("documentclass" in frontmatter)) {
		frontmatter["documentclass"] = "report";
	}
	if (!("division" in frontmatter)) {
		frontmatter["division"] = "chapter";
	}
	if (!("toc" in frontmatter)) {
		frontmatter["toc"] = true;
	}
	const division = frontmatter["division"];
	delete frontmatter["chapters"];
	delete frontmatter["appendix-from"];
	delete frontmatter["division"];

	const { frontmatter: strippedFrontmatter, headerIncludes, afterBody } = extractRawLatexFrontmatter(frontmatter);

	const combined = "---\n" + stringifyYaml(strippedFrontmatter) + "---\n\n" + parts.join("\n\n") + "\n";

	const base = vaultBasePath(app);
	const dir = pluginDir(app, pluginId);
	const outputPath = path.join(base, master.parent?.path ?? "", `${master.basename}.tex`);
	const tmpInputPath = path.join(os.tmpdir(), `latex-exporter-project-${process.pid}-${Date.now()}.md`);

	await fs.writeFile(tmpInputPath, combined, "utf8");
	const headerIncludesPath = await writeRawLatexInclude(headerIncludes, "project-header");
	const afterBodyPath = await writeRawLatexInclude(afterBody, "project-afterbody");
	try {
		await runPandoc({
			inputPath: tmpInputPath,
			outputPath,
			templatePath: path.join(dir, "pandoc", "template.latex"),
			luaFilterPath: path.join(dir, "pandoc", "theorems.lua"),
			cwd: path.dirname(path.join(base, master.path)),
			topLevelDivision: typeof division === "string" ? division : "chapter",
			headerIncludesPath,
			afterBodyPath,
		});
	} finally {
		await fs.rm(tmpInputPath, { force: true });
		if (headerIncludesPath) await fs.rm(headerIncludesPath, { force: true });
		if (afterBodyPath) await fs.rm(afterBodyPath, { force: true });
	}

	return outputPath;
}

/** Exports the project to LaTeX, compiles it to PDF, and opens the result. */
export async function exportProjectToPdf(app: App, master: TFile, pluginId: string): Promise<string> {
	const texPath = await exportProjectToLatex(app, master, pluginId);
	const pdfPath = await compileToPdf({ texPath, cwd: path.dirname(texPath) });
	await openInDefaultApp(pdfPath);
	return pdfPath;
}
