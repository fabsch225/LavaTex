import { type App, Modal } from "obsidian";

/** Prompts for a snippet of raw LaTeX and hands it to `onSubmit`. */
export class RawLatexModal extends Modal {
	private value = "";

	constructor(
		app: App,
		private readonly onSubmit: (value: string) => void,
	) {
		super(app);
		this.setTitle("Insert raw LaTeX");
	}

	onOpen(): void {
		const input = this.contentEl.createEl("input", { type: "text" });
		input.style.width = "100%";
		input.placeholder = "\\ohnebew";
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
		const submitButton = buttonRow.createEl("button", { text: "Insert" });
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
