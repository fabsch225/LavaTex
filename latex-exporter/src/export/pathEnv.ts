// GUI apps on macOS (and often Linux) are launched from Finder/Dock rather
// than a login shell, so they don't inherit the PATH set up in .zshrc/.bashrc
// (e.g. Homebrew's /opt/homebrew/bin, or TeX Live's /Library/TeX/texbin).
// Without these, spawning a CLI tool by name can fail with ENOENT even
// though it works fine from a terminal.
const EXTRA_PATH_ENTRIES = [
	"/opt/homebrew/bin",
	"/usr/local/bin",
	"/usr/bin",
	"/bin",
	"/Library/TeX/texbin",
];

/** process.env augmented with common install locations for CLI tools. */
export function envWithExtraPath(): NodeJS.ProcessEnv {
	const existing = process.env.PATH ?? "";
	const entries = existing.split(":").filter(Boolean);
	for (const dir of EXTRA_PATH_ENTRIES) {
		if (!entries.includes(dir)) {
			entries.push(dir);
		}
	}
	return { ...process.env, PATH: entries.join(":") };
}
