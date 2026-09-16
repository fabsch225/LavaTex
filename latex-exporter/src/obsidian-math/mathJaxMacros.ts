/**
 * Bridges a note's `macros:` frontmatter into Obsidian's live MathJax
 * renderer, so `\pa`, `\vol`, `\ohalbe`, etc. render correctly in
 * edit/preview mode — not just in the exported `.tex`.
 *
 * This is purely an editor-aesthetics concern: it has no bearing on the
 * LaTeX export, which always gets the real `\newcommand` definitions
 * verbatim via the pandoc template.
 *
 * The registration technique matters: MathJax's `\newcommand` macro table
 * lives inside its TeX input processor, not on some config object we can
 * poke at after the fact — mutating `MathJax.tex.macros` post-startup is a
 * dead end (nothing re-reads it). Instead, running the `\newcommand`
 * declarations through MathJax's own `tex2chtml` once is what actually
 * registers them, the same technique the community "Extended MathJax"
 * plugin uses for its preamble.sty feature.
 */
import { loadMathJax } from "obsidian";

export async function registerMathMacros(macroSource: string): Promise<void> {
	if (!macroSource.trim()) {
		return;
	}

	await loadMathJax();
	const mathJax = window.MathJax;
	if (!mathJax) {
		return;
	}

	const apply = () => {
		try {
			mathJax.tex2chtml?.(macroSource);
		} catch (err) {
			// A malformed macro definition shouldn't break the plugin —
			// surface it for debugging and move on.
			console.error("latex-exporter: failed to register math macros", err);
		}
	};

	if (typeof mathJax.tex2chtml === "function") {
		apply();
		return;
	}

	// MathJax hasn't finished starting up yet; defer until it has, chaining
	// onto whatever ready-hook is already there instead of replacing it.
	const startup = mathJax.startup;
	if (!startup) {
		return;
	}
	const previousReady = startup.ready ?? startup.defaultReady;
	startup.ready = () => {
		previousReady?.();
		apply();
	};
}
