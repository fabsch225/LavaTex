/**
 * A small, self-contained `\newcommand`/`\renewcommand` expander for plain-
 * Markdown export: a note's `macros:` field defines custom commands that
 * only mean something to a LaTeX compiler (or this plugin's own MathJax
 * macro registration in the editor) — a plain Markdown viewer has no idea
 * what `\pa` or `\vol` expand to. Rather than just dumping the raw
 * `\newcommand{...}` definitions at the top of the exported file (still
 * useless without a LaTeX-aware reader), every invocation in the body is
 * substituted with its expansion, so the exported math is self-contained.
 */
export interface MacroDef {
	argCount: number;
	body: string;
}

function extractBalanced(text: string, start: number): { content: string; end: number } | undefined {
	if (text[start] !== "{") return undefined;
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === "{") depth++;
		else if (text[i] === "}") {
			depth--;
			if (depth === 0) return { content: text.slice(start + 1, i), end: i + 1 };
		}
	}
	return undefined;
}

const DEF_START = /\\(?:new|renew)command\*?\{\\([a-zA-Z]+)\}/g;

/** Parses every `\newcommand`/`\renewcommand` in a note's `macros:` text into a name -> definition map. */
export function parseMacros(macrosText: string): Map<string, MacroDef> {
	const defs = new Map<string, MacroDef>();
	DEF_START.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = DEF_START.exec(macrosText))) {
		const name = match[1];
		let pos = DEF_START.lastIndex;

		let argCount = 0;
		const argCountMatch = /^\[(\d+)\]/.exec(macrosText.slice(pos));
		if (argCountMatch) {
			argCount = parseInt(argCountMatch[1], 10);
			pos += argCountMatch[0].length;
			// An optional default value for the first argument, e.g. [1][default] -- expansion with a
			// literally-omitted first argument isn't supported, so this is only skipped, not applied.
			const defaultMatch = /^\[[^\]]*\]/.exec(macrosText.slice(pos));
			if (defaultMatch) pos += defaultMatch[0].length;
		}
		while (macrosText[pos] === " " || macrosText[pos] === "\n" || macrosText[pos] === "\t") pos++;

		const body = extractBalanced(macrosText, pos);
		if (!body) continue;
		defs.set(name, { argCount, body: body.content });
		DEF_START.lastIndex = body.end;
	}
	return defs;
}

const MAX_PASSES = 10;

/** Substitutes every `\name{arg1}...{argN}` invocation with its expansion, re-expanding up to MAX_PASSES times so a macro defined in terms of another macro fully resolves. */
export function expandMacros(text: string, macros: ReadonlyMap<string, MacroDef>): string {
	if (macros.size === 0) return text;

	let result = text;
	for (let pass = 0; pass < MAX_PASSES; pass++) {
		let changed = false;
		let out = "";
		let i = 0;
		while (i < result.length) {
			const nameMatch = result[i] === "\\" ? /^\\([a-zA-Z]+)/.exec(result.slice(i)) : null;
			const def = nameMatch ? macros.get(nameMatch[1]) : undefined;
			if (nameMatch && def) {
				let pos = i + nameMatch[0].length;
				const args: string[] = [];
				let ok = true;
				for (let a = 0; a < def.argCount; a++) {
					while (result[pos] === " ") pos++;
					const arg = extractBalanced(result, pos);
					if (!arg) {
						ok = false;
						break;
					}
					args.push(arg.content);
					pos = arg.end;
				}
				if (ok) {
					let expansion = def.body;
					for (let a = 0; a < args.length; a++) {
						expansion = expansion.split(`#${a + 1}`).join(args[a]);
					}
					out += expansion;
					i = pos;
					changed = true;
					continue;
				}
			}
			out += result[i];
			i++;
		}
		result = out;
		if (!changed) break;
	}
	return result;
}
