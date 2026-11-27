import { describe, expect, it } from "vitest";

import { convertCallouts } from "../src/latex/calloutBlocks";
import { preprocessTheoremBlocks } from "../src/latex/theoremBlockPreprocessor";

const TRIGGERS = new Map([
	["task", "task"],
	["lemma", "lemma"],
	["beweis", "proof"],
	["proof", "proof"],
]);

describe("convertCallouts", () => {
	it("turns an environment callout into a bold-statement block with title and label", () => {
		const text = "Before.\n\n> [!task] Problem Statement {#task-holo}\n> Show that $f$ is holomorphic.\n> $$\n> x\n> $$\n\nAfter.";

		expect(convertCallouts(text, TRIGGERS)).toBe(
			"Before.\n\n**task** (Problem Statement) {#task-holo}\nShow that $f$ is holomorphic.\n$$\nx\n$$\n∎\n\nAfter.",
		);
	});

	it("matches the callout type against environment ids and names, case-insensitively, ignoring fold markers", () => {
		expect(convertCallouts("> [!Proof]-\n> Trivial.", TRIGGERS)).toBe("**proof**\nTrivial.\n∎");
		expect(convertCallouts("> [!beweis]\n> Trivial.", TRIGGERS)).toBe("**beweis**\nTrivial.\n∎");
	});

	it("nests callouts inside callouts", () => {
		const text = "> [!lemma]\n> Statement.\n> > [!proof]\n> > Argument.";

		expect(convertCallouts(text, TRIGGERS)).toBe("**lemma**\nStatement.\n**proof**\nArgument.\n∎\n∎");
	});

	it("turns a non-theorem callout into an environment named after its type", () => {
		expect(convertCallouts("> [!Info] Heads up {#note-a}\n> Text.", TRIGGERS)).toBe("**callout:info** (Heads up) {#note-a}\nText.\n∎");

		const out = preprocessTheoremBlocks(convertCallouts("> [!warning]\n> Careful.\n> > [!lemma]\n> > Inner.", TRIGGERS), TRIGGERS);
		expect(out).toBe(
			':::::::::::::::::::: {.callout type="warning"}\nCareful.\n\n::::::::::::::::::: {.lemma}\nInner.\n\n:::::::::::::::::::\n\n::::::::::::::::::::',
		);
	});

	it("keeps a non-theorem callout as a blockquote with a bold title for Markdown export", () => {
		const opts = { unknown: "blockquote" } as const;
		expect(convertCallouts("> [!info] Heads up\n> Text.", TRIGGERS, opts)).toBe("> **Heads up**\n> Text.");
		expect(convertCallouts("> [!info]\n>\n> Text.", TRIGGERS, opts)).toBe("> **Info**\n>\n> Text.");
	});

	it("does not open a callout environment from ordinary bold text", () => {
		expect(preprocessTheoremBlocks("**callout:bad name** text", TRIGGERS)).toBe("**callout:bad name** text");
	});

	it("leaves plain blockquotes and fenced code alone", () => {
		const text = "> Just a quote.\n\n```\n> [!task] not a callout\n```";

		expect(convertCallouts(text, TRIGGERS)).toBe(text);
	});

	it("feeds titles with parentheses through to the fenced div whole", () => {
		const out = preprocessTheoremBlocks(convertCallouts("> [!task] Continuity of $f(x)$\n> Body.", TRIGGERS), TRIGGERS);

		expect(out).toContain('title="Continuity of $f(x)$"');
		expect(out).toContain("Body.");
	});
});

describe("preprocessTheoremBlocks", () => {
	it("separates fences from a directly preceding text line, so pandoc still opens the div", () => {
		const text = "**lemma**\nStatement:\n$$x$$\n**proof**\nArgument.\n∎\n∎";

		expect(preprocessTheoremBlocks(text, TRIGGERS)).toBe(
			":::::::::::::::::::: {.lemma}\nStatement:\n$$x$$\n\n::::::::::::::::::: {.proof}\nArgument.\n\n:::::::::::::::::::\n\n::::::::::::::::::::",
		);
	});
});
