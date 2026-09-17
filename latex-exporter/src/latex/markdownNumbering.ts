/**
 * Plain-Markdown export has no LaTeX compiler behind it to resolve
 * `\ref{}`/`\label{}` at compile time, so this does the same job by hand:
 * walks the note top to bottom, counts theorem-like blocks and labelled
 * equations exactly the way `\newtheorem{...}[counter]` and
 * `\numberwithin{equation}{...}` would (shared counters via `like:`,
 * resetting on the heading level the counter is tied to), stamps the
 * resolved number onto each theorem header and labelled equation, and
 * replaces every `[#label]`/`[@eq:label]` reference with that number —
 * `[#label]` as the bare number (like `\ref`), `[@eq:label]` parenthesized
 * (like `\eqref`). A reference to an unknown label is left untouched rather
 * than silently dropped, so a typo stays visible instead of disappearing.
 */
export interface TheoremSpec {
	id: string;
	name: string;
	counter?: string;
	like?: string;
}

const HEADING = /^(#{1,6})\s+/;
const BOLD_HEADER = /^\*\*([^*]+)\*\*/;
const LABEL_ATTR = /\{#([\w:-]+)\}/;
const EQ_LABEL_LINE = /^\{#(eq:[\w-]+)\}\s*$/;
const EQ_LABEL_TRAILING = /^(\$\$)\s*\{#(eq:[\w-]+)\}\s*$/;
const REF_EQ_PAREN = /\[@(eq:[\w-]+)\]/g;
const REF_PLAIN = /\[#([\w:-]+)\]/g;

function normalizeName(word: string): string {
	return word.trim().replace(/\.$/, "").toLowerCase();
}

/** "section" -> 1, "subsection" -> 2, "subsubsection" -> 3; anything else (incl. "chapter", meaningless in a single note) -> no compound prefix. */
function levelForCounterName(name: string | undefined): number | null {
	switch (name) {
		case "section":
			return 1;
		case "subsection":
			return 2;
		case "subsubsection":
			return 3;
		default:
			return null;
	}
}

/** Follows a `like:` chain to the environment that actually owns a counter, cycle-safe. */
function ownerOf(id: string, specsById: ReadonlyMap<string, TheoremSpec>): TheoremSpec | undefined {
	const seen = new Set<string>();
	let current = specsById.get(id);
	while (current?.like && !seen.has(current.id)) {
		seen.add(current.id);
		current = specsById.get(current.like);
	}
	return current;
}

export function resolveNumbering(body: string, theorems: TheoremSpec[], numberwithin: string): string {
	const specsById = new Map(theorems.map((t) => [t.id, t]));
	const triggerToId = new Map(theorems.map((t) => [normalizeName(t.name), t.id]));
	const eqLevel = levelForCounterName(numberwithin ?? "section");

	const headingCounters = [0, 0, 0, 0]; // index 0 unused, 1..3 = #, ##, ###
	const theoremCounters = new Map<string, number>();
	let eqCounter = 0;
	const labelToNumber = new Map<string, string>();

	const resetFrom = (depth: number) => {
		for (let l = depth; l <= 3; l++) headingCounters[l] = 0;
		for (const spec of theorems) {
			const level = levelForCounterName(spec.counter);
			if (level !== null && level >= depth) theoremCounters.set(spec.id, 0);
		}
		if (eqLevel !== null && eqLevel >= depth) eqCounter = 0;
	};

	const numberFor = (level: number | null, count: number): string => {
		const levelValue = level !== null ? headingCounters[level] : 0;
		return levelValue > 0 ? `${levelValue}.${count}` : `${count}`;
	};

	const lines = body.split("\n");
	const out: string[] = [];

	for (const line of lines) {
		const heading = HEADING.exec(line);
		if (heading) {
			const depth = heading[1].length;
			if (depth <= 3) {
				headingCounters[depth]++;
				resetFrom(depth + 1);
			}
			out.push(line);
			continue;
		}

		const trailingEq = EQ_LABEL_TRAILING.exec(line.trim());
		const ownLineEq = EQ_LABEL_LINE.exec(line.trim());
		if (trailingEq || (ownLineEq && out.length > 0 && out[out.length - 1].trim() === "$$")) {
			eqCounter++;
			const number = numberFor(eqLevel, eqCounter);
			const label = (trailingEq ?? ownLineEq)![trailingEq ? 2 : 1];
			labelToNumber.set(label, number);
			if (trailingEq) {
				out.push(trailingEq[1]);
			}
			out[out.length - 1] = out[out.length - 1] + ` (${number})`;
			continue;
		}

		const header = BOLD_HEADER.exec(line);
		const id = header && triggerToId.get(normalizeName(header[1]));
		if (header && id) {
			const owner = ownerOf(id, specsById);
			const counterKey = owner?.id ?? id;
			const count = (theoremCounters.get(counterKey) ?? 0) + 1;
			theoremCounters.set(counterKey, count);
			const number = numberFor(levelForCounterName(owner?.counter), count);

			const labelMatch = LABEL_ATTR.exec(line);
			if (labelMatch) labelToNumber.set(labelMatch[1], number);

			const spec = specsById.get(id)!;
			const renumbered = line.replace(BOLD_HEADER, `**${spec.name} ${number}**`).replace(LABEL_ATTR, "").trimEnd();
			out.push(renumbered);
			continue;
		}

		out.push(line);
	}

	let text = out.join("\n");
	text = text.replace(REF_EQ_PAREN, (whole, label: string) => {
		const number = labelToNumber.get(label);
		return number ? `(${number})` : whole;
	});
	text = text.replace(REF_PLAIN, (whole, label: string) => {
		const number = labelToNumber.get(label);
		return number ?? whole;
	});

	return text;
}
