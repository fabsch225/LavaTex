import { type App, Modal } from "obsidian";

export interface PromptModalOptions {
	title: string;
	placeholder?: string;
	submitLabel?: string;
}

/** Prompts for a single line of text and hands it to `onSubmit`. */
export class PromptModal extends Modal {
	private value = "";

	constructor(
		app: App,
		private readonly options: PromptModalOptions,
		private readonly onSubmit: (value: string) => void,
	) {
		super(app);
		this.setTitle(options.title);
	}

	onOpen(): void {
		const input = this.contentEl.createEl("input", { type: "text" });
		input.style.width = "100%";
		if (this.options.placeholder) {
			input.placeholder = this.options.placeholder;
		}
		input.addEventListener("input", () => {
			this.value = input.value;
		});
		input.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				this.submit();
			}
		});
		input.focus();

		const buttonRow = this.contentEl.createDiv();
		buttonRow.style.marginTop = "1em";
		buttonRow.style.textAlign = "right";
		const submitButton = buttonRow.createEl("button", { text: this.options.submitLabel ?? "Insert" });
		submitButton.addEventListener("click", () => this.submit());
	}

	private submit(): void {
		const trimmed = this.value.trim();
		if (!trimmed) {
			return;
		}
		this.close();
		this.onSubmit(trimmed);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
