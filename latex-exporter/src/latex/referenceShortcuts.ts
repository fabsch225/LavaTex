/**
 * `[#some-label]` -> a raw `\ref{some-label}` span.
 *
 * Mirrors pandoc-crossref's `[@eq:foo]` shortcut for numbered equations, but
 * for everything else: theorem-like environments already get a real
 * amsthm/hyperref `\label{}` from a bold-statement header's `{#id}`
 * (see `theoremBlockPreprocessor.ts`), and plain `\ref{}` resolves it
 * directly at LaTeX-compile time — no pandoc filter involved. This is pure
 * syntax sugar over typing that raw LaTeX span by hand.
 */
const REFERENCE_SHORTCUT = /\[#([\w:-]+)\]/g;

export function expandReferenceShortcuts(text: string): string {
	return text.replace(REFERENCE_SHORTCUT, (_match, label: string) => "`\\ref{" + label + "}`{=latex}");
}
