/**
 * Loads a Node builtin on first use rather than at import time. Obsidian
 * mobile has no Node runtime, so a top-level `import ... from "child_process"`
 * anywhere in this package would crash the whole plugin on load there — even
 * though mobile only ever uses the pandoc-free and remote code paths.
 */
export function nodeRequire<T>(id: string): T {
	return require(id) as T;
}
