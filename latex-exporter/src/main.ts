import { Notice, Platform, Plugin, type TFile, getFrontMatterInfo, parseYaml } from "obsidian";

import { collectLabels, extractInlineMacros, resolveFrontmatterReferences } from "lavatex-core";

import { type ExportEnv, exportNote, exportNoteToMarkdown, readWithDefaults } from "./export/exporter";
import { obsidianNoteReader } from "./export/obsidianNoteReader";
import { exportProject } from "./export/project";
import { registerMathMacros } from "./obsidian-math/mathJaxMacros";
import { CloudRunToolchain } from "./remote/cloudRun";
import { GitHubActionsToolchain } from "./remote/githubActions";
import type { RemoteToolchain } from "./remote/types";
import { DEFAULT_SETTINGS, type LatexExporterSettings, LatexExporterSettingTab } from "./settings";
import { PromptModal } from "./ui/PromptModal";
import { ReferenceSuggestModal } from "./ui/ReferenceSuggestModal";

const ENVIRONMENT_END_MARK = "∎";

export default class LatexExporterPlugin extends Plugin {
	settings: LatexExporterSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<LatexExporterSettings> | null) };
		this.addSettingTab(new LatexExporterSettingTab(this.app, this));

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
			id: "export-project-to-latex",
			name: "Export project to LaTeX",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") {
					return false;
				}
				const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (!frontmatter || !Array.isArray(frontmatter["chapters"])) {
					return false;
				}
				if (!checking) {
					void this.runProjectExport(file);
				}
				return true;
			},
		});

		this.addCommand({
			id: "export-project-to-pdf",
			name: "Export project to PDF",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") {
					return false;
				}
				const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (!frontmatter || !Array.isArray(frontmatter["chapters"])) {
					return false;
				}
				if (!checking) {
					void this.runProjectPdfExport(file);
				}
				return true;
			},
		});

		this.addCommand({
			id: "export-note-to-markdown",
			name: "Export plain Markdown",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") {
					return false;
				}
				if (!checking) {
					void this.runMarkdownExport(file);
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
		let resolved: string;
		try {
			const withDefaults = await readWithDefaults(this.app, file, this.settings.defaultFrontmatterNote);
			resolved = await resolveFrontmatterReferences(obsidianNoteReader(this.app), file, withDefaults);
		} catch {
			// A dangling `macros: "[[...]]"` link while typing, or a missing
			// default-frontmatter note — export reports either.
			resolved = body;
		}
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

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	remoteToolchain(): RemoteToolchain {
		return this.settings.remoteBackend === "cloudrun"
			? new CloudRunToolchain(this.app, () => this.settings)
			: new GitHubActionsToolchain(this.app, () => this.settings);
	}

	private exportEnv(notice: Notice): ExportEnv {
		const remote = !Platform.isDesktopApp || this.settings.compileMode === "remote";
		return {
			app: this.app,
			pluginDir: this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`,
			remote: remote ? this.remoteToolchain() : undefined,
			engine: this.settings.latexEngine,
			defaultFrontmatterNote: this.settings.defaultFrontmatterNote,
			onProgress: (message) => notice.setMessage(message),
		};
	}

	/** Runs one LaTeX/PDF export behind a sticky progress notice. */
	private async runWithNotice(label: string, work: (env: ExportEnv) => Promise<string>): Promise<void> {
		const notice = new Notice(`${label}…`, 0);
		try {
			const outputPath = await work(this.exportEnv(notice));
			notice.hide();
			new Notice(`Exported to ${outputPath.split("/").pop()}`);
		} catch (err) {
			notice.hide();
			console.error(err);
			const message = err instanceof Error ? err.message : String(err);
			// Remote failures carry a log tail after the first line; keep it visible longer.
			new Notice(`${label} failed: ${message.split("\n").slice(0, 8).join("\n")}`, message.includes("\n") ? 20_000 : 8_000);
		}
	}

	private runExport(file: TFile): Promise<void> {
		return this.runWithNotice("LaTeX export", (env) => exportNote(env, file, false));
	}

	private runPdfExport(file: TFile): Promise<void> {
		return this.runWithNotice("PDF export", (env) => exportNote(env, file, true));
	}

	private runProjectExport(file: TFile): Promise<void> {
		return this.runWithNotice("Project export", (env) => exportProject(env, file, false));
	}

	private runProjectPdfExport(file: TFile): Promise<void> {
		return this.runWithNotice("Project PDF export", (env) => exportProject(env, file, true));
	}

	private async runMarkdownExport(file: TFile): Promise<void> {
		try {
			const outputPath = await exportNoteToMarkdown(this.app, file, this.settings.defaultFrontmatterNote);
			new Notice(`Exported to ${outputPath.split("/").pop()}`);
		} catch (err) {
			console.error(err);
			const message = err instanceof Error ? err.message : String(err);
			new Notice(`Markdown export failed: ${message.split("\n")[0]}`);
		}
	}
}
