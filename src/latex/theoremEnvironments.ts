/**
 * Maps the natural-language trigger words a note can bold (`**Theorem**`,
 * `**Beweis**`, ...) to the LaTeX environment id `theorems.lua` should
 * produce (`theorem`, `proof`, ...).
 *
 * Entirely data-driven from frontmatter, so the words you type match
 * whatever `theorems:` and `proofname:` the note already declares for the
 * pandoc template — one source of truth, not two.
 */
export function collectEnvironmentTriggers(frontmatter: Record<string, unknown> | undefined): Map<string, string> {
	const triggers = new Map<string, string>();

	const proofName = typeof frontmatter?.["proofname"] === "string" ? (frontmatter["proofname"] as string) : "Proof";
	triggers.set(normalize(proofName), "proof");
	triggers.set("proof", "proof");

	const theorems = frontmatter?.["theorems"];
	if (Array.isArray(theorems)) {
		for (const entry of theorems) {
			if (!entry || typeof entry !== "object") continue;
			const id = (entry as { id?: unknown }).id;
			const name = (entry as { name?: unknown }).name;
			if (typeof id === "string" && typeof name === "string") {
				triggers.set(normalize(name), id);
			}
		}
	}

	return triggers;
}

function normalize(word: string): string {
	return word.trim().replace(/\.$/, "").toLowerCase();
}
