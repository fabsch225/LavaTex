import { type App, Notice, Platform, PluginSettingTab, SecretComponent, Setting } from "obsidian";

import type { LatexEngine } from "lavatex-core";

import type LatexExporterPlugin from "./main";

export interface LatexExporterSettings {
	/** Desktop only — mobile always compiles remotely. */
	compileMode: "local" | "remote";
	/** Used both locally and remotely. */
	latexEngine: LatexEngine;
	remoteBackend: "github" | "cloudrun";
	/** `owner/name` of the user's private compile repo. */
	githubRepo: string;
	/** Secret-storage id of the fine-grained GitHub token (never the token itself). */
	githubTokenSecret: string;
	githubWorkflow: string;
	cloudRunUrl: string;
	/** Secret-storage id of the service account key JSON (never the key itself). */
	cloudRunKeySecret: string;
}

export const DEFAULT_SETTINGS: LatexExporterSettings = {
	compileMode: "local",
	latexEngine: "latexmk",
	remoteBackend: "github",
	githubRepo: "",
	githubTokenSecret: "",
	githubWorkflow: "lavatex.yml",
	cloudRunUrl: "",
	cloudRunKeySecret: "",
};

export class LatexExporterSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: LatexExporterPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;
		containerEl.empty();

		if (Platform.isDesktopApp) {
			new Setting(containerEl)
				.setName("Compile with")
				.setDesc("Local uses pandoc, pandoc-crossref and latexmk installed on this computer. Mobile always compiles remotely.")
				.addDropdown((dropdown) =>
					dropdown
						.addOption("local", "Local toolchain")
						.addOption("remote", "Remote backend")
						.setValue(settings.compileMode)
						.onChange(async (value) => {
							settings.compileMode = value as LatexExporterSettings["compileMode"];
							await this.plugin.saveSettings();
						}),
				);
		}

		new Setting(containerEl)
			.setName("LaTeX engine")
			.setDesc(
				"latexmk runs pdfLaTeX from a full TeX distribution. Tectonic is a small XeTeX-based engine that downloads only the packages a document needs, so no TeX install is required (locally: brew install tectonic). Applies to local and remote compilation.",
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("latexmk", "latexmk (pdfLaTeX)")
					.addOption("tectonic", "Tectonic (XeTeX, on-demand packages)")
					.setValue(settings.latexEngine)
					.onChange(async (value) => {
						settings.latexEngine = value as LatexEngine;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName("Remote compilation").setHeading();

		new Setting(containerEl)
			.setName("Remote backend")
			.setDesc("Where exports run when compiling remotely. Both run in your own account; see the setup guide.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("github", "GitHub Actions")
					.addOption("cloudrun", "Google Cloud Run")
					.setValue(settings.remoteBackend)
					.onChange(async (value) => {
						settings.remoteBackend = value as LatexExporterSettings["remoteBackend"];
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (settings.remoteBackend === "github") {
			new Setting(containerEl)
				.setName("Repository")
				.setDesc("Your private repository holding .github/workflows/lavatex.yml, as owner/name.")
				.addText((text) =>
					text
						.setPlaceholder("you/lavatex-compile")
						.setValue(settings.githubRepo)
						.onChange(async (value) => {
							settings.githubRepo = value.trim();
							await this.plugin.saveSettings();
						}),
				);
			new Setting(containerEl)
				.setName("GitHub token")
				.setDesc("A fine-grained token for that one repository only, with Contents and Actions set to read and write.")
				.addComponent((el) =>
					new SecretComponent(this.app, el).setValue(settings.githubTokenSecret).onChange(async (value) => {
						settings.githubTokenSecret = value;
						await this.plugin.saveSettings();
					}),
				);
			new Setting(containerEl)
				.setName("Workflow file")
				.addText((text) =>
					text
						.setPlaceholder("lavatex.yml")
						.setValue(settings.githubWorkflow)
						.onChange(async (value) => {
							settings.githubWorkflow = value.trim();
							await this.plugin.saveSettings();
						}),
				);
		} else {
			new Setting(containerEl)
				.setName("Service URL")
				.setDesc("Printed by deploy.sh, e.g. https://lavatex-compiler-xxxx.europe-west1.run.app")
				.addText((text) =>
					text
						.setPlaceholder("https://…run.app")
						.setValue(settings.cloudRunUrl)
						.onChange(async (value) => {
							settings.cloudRunUrl = value.trim();
							await this.plugin.saveSettings();
						}),
				);
			new Setting(containerEl)
				.setName("Service account key")
				.setDesc("The whole JSON key file of the lavatex-client service account.")
				.addComponent((el) =>
					new SecretComponent(this.app, el).setValue(settings.cloudRunKeySecret).onChange(async (value) => {
						settings.cloudRunKeySecret = value;
						await this.plugin.saveSettings();
					}),
				);
		}

		new Setting(containerEl)
			.setName("Test connection")
			.setDesc("Checks the remote backend's configuration and credentials. Nothing is compiled.")
			.addButton((button) =>
				button.setButtonText("Test").onClick(async () => {
					button.setDisabled(true);
					try {
						new Notice(await this.plugin.remoteToolchain().check());
					} catch (err) {
						new Notice(`Connection failed: ${err instanceof Error ? err.message : String(err)}`, 10_000);
					} finally {
						button.setDisabled(false);
					}
				}),
			);
	}
}
