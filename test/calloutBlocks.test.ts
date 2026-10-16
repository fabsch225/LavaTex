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

	it("keeps an unknown callout as a blockquote with a bold title", () => {
		expect(convertCallouts("> [!info] Heads up\n> Text.", TRIGGERS)).toBe("> **Heads up**\n> Text.");
		expect(convertCallouts("> [!info]\n>\n> Text.", TRIGGERS)).toBe("> **Info**\n>\n> Text.");
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
