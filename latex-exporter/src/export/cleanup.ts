/**
 * "Clean up": removes everything an export left next to a note — the .tex,
 * the .pdf, latexmk/pdfLaTeX auxiliary files and the plain-Markdown export —
 * keeping the note itself. Files go to the trash (system trash, else the
 * vault's .trash folder), so a cleanup can be undone.
 */
import { normalizePath, type App, type TFile } from "obsidian";

/** Every suffix an export or compile can leave as `<note basename><suffix>`. */
const GENERATED_SUFFIXES = [
	".tex",
	".pdf",
	".exported.md",
	".aux",
	".log",
	".out",
	".toc",
	".fls",
	".fdb_latexmk",
	".synctex.gz",
	".synctex(busy)",
	".bbl",
	".blg",
	".bcf",
	".run.xml",
	".lof",
	".lot",
	".nav",
	".snm",
	".xdv",
];

/** Moves `file`'s generated siblings to the trash; returns the vault paths removed. */
export async function cleanUpExports(app: App, file: TFile): Promise<string[]> {
	const folder = file.parent && file.parent.path !== "/" ? `${file.parent.path}/` : "";
	const removed: string[] = [];

	for (const suffix of GENERATED_SUFFIXES) {
		const path = normalizePath(`${folder}${file.basename}${suffix}`);
		if (path === file.path || !(await app.vault.adapter.exists(path))) continue;

		const indexed = app.vault.getAbstractFileByPath(path);
		if (indexed) {
			// Respects the user's "Deleted files" setting and keeps links/the file explorer in sync.
			await app.fileManager.trashFile(indexed);
		} else if (!(await app.vault.adapter.trashSystem(path))) {
			await app.vault.adapter.trashLocal(path);
		}
		removed.push(path);
	}

	return removed;
}
