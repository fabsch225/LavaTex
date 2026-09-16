/**
 * Orchestrates a single note's export: read it, run the note-syntax ->
 * pandoc-syntax preprocessing passes, hand the result to pandoc, clean up.
 *
 * Each preprocessing step lives in its own module under `../latex/` (pure
 * text transforms, order mostly irrelevant since each targets disjoint
 * syntax) so this file stays a thin sequence of calls, not a place where
 * unrelated concerns accumulate.
 */
import { type App, type TFile } from "obsidian";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

import { collectEnvironmentTriggers } from "../latex/theoremEnvironments";
import { preprocessTheoremBlocks } from "../latex/theoremBlockPreprocessor";
import { wrapBareAlignEnvironments } from "../latex/rawEnvironments";
import { expandReferenceShortcuts } from "../latex/referenceShortcuts";
import { runPandoc } from "./pandoc";
import { pluginDir, vaultBasePath } from "./paths";

export async function exportNoteToLatex(app: App, file: TFile, pluginId: string): Promise<string> {
	const raw = await app.vault.read(file);
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const triggers = collectEnvironmentTriggers(frontmatter);

	const preprocessed = expandReferenceShortcuts(
		preprocessTheoremBlocks(wrapBareAlignEnvironments(raw), triggers),
	);

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
