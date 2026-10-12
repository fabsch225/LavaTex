/**
 * Scans a note for every `{#label}` attribute — bold-statement theorem
 * headers and labelled `$$...$$ {#eq:foo}` equations both use this same
 * syntax — so the "insert reference" command can offer them in a picker
 * instead of the user hunting down and retyping a label by hand.
 */
export interface LabelEntry {
	label: string;
	/** Short human-readable context shown in the picker. */
	context: string;
}

const LABEL_ATTR = /\{#([\w:-]+)\}/g;
const BOLD_HEADER = /^\*\*([^*]+)\*\*/;

export function collectLabels(noteText: string): LabelEntry[] {
	const lines = noteText.split("\n");
	const entries: LabelEntry[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const attrRe = new RegExp(LABEL_ATTR);
		let match: RegExpExecArray | null;
		while ((match = attrRe.exec(line)) !== null) {
			const label = match[1];
			const context = BOLD_HEADER.test(line)
				? line.replace(LABEL_ATTR, "").trim()
				: (nearestPrecedingText(lines, i) ?? label);
			entries.push({ label, context });
		}
	}

	return entries;
}

/** Looks upward for the nearest non-blank, non-math-fence line for context (e.g. above a labelled equation). */
function nearestPrecedingText(lines: string[], index: number): string | undefined {
	for (let i = index - 1; i >= 0; i--) {
		const trimmed = lines[i].trim();
		if (trimmed && trimmed !== "$$" && trimmed !== "$") {
			return trimmed;
		}
	}
	return undefined;
}
