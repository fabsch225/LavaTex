/**
 * Orchestrates a single note's export: read it, run the note-syntax ->
 * pandoc-syntax preprocessing passes, hand the result to pandoc, clean up.
 *
 * Each preprocessing step lives in its own module under `../latex/` (pure
 * text transforms, order mostly irrelevant since each targets disjoint
 * syntax) so this file stays a thin sequence of calls, not a place where
 * unrelated concerns accumulate.
 */
import { type App, type TFile, getFrontMatterInfo, parseYaml } from "obsidian";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

import { collectEnvironmentTriggers } from "../latex/theoremEnvironments";
import { preprocessTheoremBlocks } from "../latex/theoremBlockPreprocessor";
import { convertAlignBlocksToRaw } from "../latex/rawEnvironments";
import { expandReferenceShortcuts } from "../latex/referenceShortcuts";
import { expandCitations } from "./citations";
import { resolveFrontmatterReferences } from "./frontmatterRefs";
import { compileToPdf, openInDefaultApp } from "./latex";
import { runPandoc, runPandocToMarkdown } from "./pandoc";
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

/** Exports the note to plain markdown: same preprocessing as LaTeX, but no template/theorems.lua. */
export async function exportNoteToMarkdown(app: App, file: TFile): Promise<string> {
	const preprocessed = await preprocessNote(app, file);

	const base = vaultBasePath(app);
	const outputPath = path.join(base, file.parent?.path ?? "", `${file.basename}.exported.md`);
	const tmpInputPath = path.join(os.tmpdir(), `latex-exporter-${process.pid}-${Date.now()}.md`);

	await fs.writeFile(tmpInputPath, preprocessed, "utf8");
	try {
		await runPandocToMarkdown({
			inputPath: tmpInputPath,
			outputPath,
			cwd: path.dirname(path.join(base, file.path)),
		});
	} finally {
		await fs.rm(tmpInputPath, { force: true });
	}

	return outputPath;
}
