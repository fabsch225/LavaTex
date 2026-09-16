import { FileSystemAdapter, type App } from "obsidian";
import * as path from "path";

/** Absolute path to the vault's root folder on disk. */
export function vaultBasePath(app: App): string {
	if (!(app.vault.adapter instanceof FileSystemAdapter)) {
		throw new Error("LaTeX export requires the Obsidian desktop app.");
	}
	return app.vault.adapter.getBasePath();
}

/** Absolute path to this plugin's own installed folder (where pandoc/ lives). */
export function pluginDir(app: App, pluginId: string): string {
	return path.join(vaultBasePath(app), app.vault.configDir, "plugins", pluginId);
}
