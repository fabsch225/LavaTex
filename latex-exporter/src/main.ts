import { Notice, Plugin, type TFile, getFrontMatterInfo, parseYaml } from "obsidian";

import { exportNoteToLatex, exportNoteToPdf } from "./export/exporter";
import { resolveFrontmatterReferences } from "./export/frontmatterRefs";
import { extractInlineMacros } from "./latex/inlineMacros";
import { collectLabels } from "./latex/labelCollector";
import { registerMathMacros } from "./obsidian-math/mathJaxMacros";
import { PromptModal } from "./ui/PromptModal";
import { ReferenceSuggestModal } from "./ui/ReferenceSuggestModal";

const ENVIRONMENT_END_MARK = "∎";

export default class LatexExporterPlugin extends Plugin {
	async onload(): Promise<void> {
		this.addCommand({
			id: "export-note-to-latex",
			name: "Export current note to LaTeX",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") {
					return false;
				}
				if (!checking) {
					void this.runExport(file);
				}
				return true;
			},
		});

		// Keep MathJax's macro table in sync with whichever note is open, so
		// custom commands like \pa or \vol render in edit/preview mode too.
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const file = this.app.workspace.getActiveFile();
				if (file) void this.refreshMathMacros(file);
			}),
		);
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				if (file === this.app.workspace.getActiveFile()) {
					void this.refreshMathMacros(file);
				}
			}),
		);

		const active = this.app.workspace.getActiveFile();
		if (active) {
			void this.refreshMathMacros(active);
		}

		this.addCommand({
			id: "export-note-to-pdf",
			name: "Export current note to PDF",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") {
					return false;
				}
				if (!checking) {
					void this.runPdfExport(file);
				}
				return true;
			},
		});

		this.addCommand({
			id: "insert-reference",
			name: "Insert reference to label",
			editorCallback: async (editor) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) {
					return;
				}
				const text = await this.app.vault.cachedRead(file);
				const entries = collectLabels(text);
				if (entries.length === 0) {
					new Notice("No labelled theorems/equations found in this note.");
					return;
				}
				new ReferenceSuggestModal(this.app, entries, editor).open();
			},
		});

		this.addCommand({
			id: "reference-equation",
			name: "Reference equation",
			editorCallback: async (editor) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) {
					return;
				}
				const text = await this.app.vault.cachedRead(file);
				const entries = collectLabels(text).filter((entry) => entry.label.startsWith("eq:"));
				if (entries.length === 0) {
					new Notice("No labelled equations found in this note.");
					return;
				}
				new ReferenceSuggestModal(
					this.app,
					entries,
					editor,
					(label) => `[@${label}]`,
					"Reference equation…",
				).open();
			},
		});

		this.addCommand({
			id: "add-equation-label",
			name: "Add equation label",
			editorCallback: (editor) => {
				new PromptModal(
					this.app,
					{ title: "Add equation label", placeholder: "doppel", submitLabel: "Add" },
					(value) => {
						const id = value.startsWith("eq:") ? value : `eq:${value}`;
						editor.replaceSelection(`{#${id}}`);
					},
				).open();
			},
		});

		this.addCommand({
			id: "add-theorem-label",
			name: "Add theorem label",
			editorCallback: (editor) => {
				new PromptModal(
					this.app,
					{ title: "Add theorem label", placeholder: "thm-weier", submitLabel: "Add" },
					(value) => {
						editor.replaceSelection(`{#${value}}`);
					},
				).open();
			},
		});

		this.addCommand({
			id: "insert-environment-end-mark",
			name: `Insert environment end mark (${ENVIRONMENT_END_MARK})`,
			editorCallback: (editor) => {
				editor.replaceSelection(ENVIRONMENT_END_MARK);
			},
		});

		this.addCommand({
			id: "insert-raw-latex",
			name: "Insert raw LaTeX",
			editorCallback: (editor) => {
				new PromptModal(this.app, { title: "Insert raw LaTeX", placeholder: "\\ohnebew" }, (value) => {
					editor.replaceSelection("`" + value + "`{=latex}");
				}).open();
			},
		});
	}

	private async refreshMathMacros(file: TFile): Promise<void> {
		const body = await this.app.vault.cachedRead(file);
		const resolved = await resolveFrontmatterReferences(this.app, file, body);
		const frontmatterInfo = getFrontMatterInfo(resolved);
		const frontmatterMacros = frontmatterInfo.exists
			? (parseYaml(frontmatterInfo.frontmatter) as Record<string, unknown>)["macros"]
			: undefined;

		const inlineMacros = extractInlineMacros(body);

		const combined = [typeof frontmatterMacros === "string" ? frontmatterMacros : "", inlineMacros]
			.filter(Boolean)
			.join("\n");
		if (!combined.trim()) {
			return;
		}
		await registerMathMacros(combined);
	}

	private async runExport(file: TFile): Promise<void> {
		try {
			const outputPath = await exportNoteToLatex(this.app, file, this.manifest.id);
			new Notice(`Exported to ${outputPath.split("/").pop()}`);
		} catch (err) {
			console.error(err);
			const message = err instanceof Error ? err.message : String(err);
			new Notice(`LaTeX export failed: ${message.split("\n")[0]}`);
		}
	}

	private async runPdfExport(file: TFile): Promise<void> {
		const notice = new Notice("Compiling PDF…", 0);
		try {
			const pdfPath = await exportNoteToPdf(this.app, file, this.manifest.id);
			notice.hide();
			new Notice(`Exported to ${pdfPath.split("/").pop()}`);
		} catch (err) {
			notice.hide();
			console.error(err);
			const message = err instanceof Error ? err.message : String(err);
			new Notice(`PDF export failed: ${message.split("\n")[0]}`);
		}
	}
}
