/**
 * Obsidian-side adapter over lavatex-core's multi-chapter project export —
 * see `exporter.ts` for the same pattern applied to a single note, and
 * `../../../src/project.ts` for the actual assembly logic.
 */
import type { TFile } from "obsidian";

import { exportProjectToLatex as coreExportProjectToLatex } from "lavatex-core";

import { buildDocument, type ExportEnv, readLatexAssets, readWithDefaults } from "./exporter";
import { obsidianNoteReader } from "./obsidianNoteReader";

export async function exportProject(env: ExportEnv, master: TFile, wantPdf: boolean): Promise<string> {
	const reader = obsidianNoteReader(env.app);
	const masterRawText = await readWithDefaults(env.app, master, env.defaultFrontmatterNote);
	const assets = await readLatexAssets(env);
	return buildDocument(env, master, wantPdf, (backend, cwd) =>
		coreExportProjectToLatex(reader, master, masterRawText, backend, assets, cwd),
	);
}
