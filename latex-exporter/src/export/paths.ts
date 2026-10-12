import { FileSystemAdapter, normalizePath, Platform, type App, type TFile } from "obsidian";

/** Vault-relative path of `<note basename>.<ext>` next to `file`. */
export function siblingPath(file: TFile, ext: string): string {
	const folder = file.parent && file.parent.path !== "/" ? `${file.parent.path}/` : "";
	return normalizePath(`${folder}${file.basename}.${ext}`);
}

/** Absolute on-disk path of a vault path. Desktop only — the local toolchain needs real paths. */
export function absolutePath(app: App, vaultPath: string): string {
	// Check the platform first: on mobile `FileSystemAdapter` isn't a usable class.
	if (!Platform.isDesktopApp || !(app.vault.adapter instanceof FileSystemAdapter)) {
		throw new Error("The local LaTeX toolchain requires the Obsidian desktop app.");
	}
	return vaultPath === "/" || vaultPath === ""
		? app.vault.adapter.getBasePath()
		: app.vault.adapter.getFullPath(normalizePath(vaultPath));
}
