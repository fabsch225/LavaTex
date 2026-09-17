import { type App, type Editor, FuzzySuggestModal } from "obsidian";

import type { LabelEntry } from "../latex/labelCollector";

/** Fuzzy-search picker for reference shortcuts, collected from the current note. */
export class ReferenceSuggestModal extends FuzzySuggestModal<LabelEntry> {
	constructor(
		app: App,
		private readonly entries: LabelEntry[],
		private readonly editor: Editor,
		private readonly format: (label: string) => string = (label) => `[#${label}]`,
		placeholder = "Insert reference to…",
	) {
		super(app);
		this.setPlaceholder(placeholder);
	}

	getItems(): LabelEntry[] {
		return this.entries;
	}

	getItemText(entry: LabelEntry): string {
		return `${entry.label} — ${entry.context}`;
	}

	onChooseItem(entry: LabelEntry): void {
		this.editor.replaceSelection(this.format(entry.label));
	}
}
