#!/usr/bin/env node
/**
 * Exports a LavaTex note (or multi-chapter project) the same way the
 * Obsidian plugin does, then compiles it — to catch syntax mistakes before
 * the user ever opens the PDF.
 *
 *   node check_note.mjs <vault-dir> <note path relative to vault> [options]
 *
 *   --engine latexmk|tectonic   LaTeX engine (default: whichever is installed, latexmk first)
 *   --no-compile                stop after pandoc (only checks the note -> .tex step)
 *
 * Writes <note>.tex / <note>.pdf next to the note, exactly like the plugin.
 * Needs pandoc + pandoc-crossref on PATH, plus latexmk or tectonic to compile.
 *
 * lavatex-core is found via (in order): $LAVATEX_CORE (path to a LavaTex
 * checkout or the package dir), a normal `require("lavatex-core")` from the
 * current directory, or a LavaTex checkout this skill lives inside.
 * The pandoc template + Lua filter come from the vault's installed plugin
 * (<vault>/.obsidian/plugins/latex-exporter/pandoc/), else $LAVATEX_ASSETS,
 * else the checkout's latex-exporter/pandoc/.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--") && !a.includes("=")));
const engineArg = argv.includes("--engine") ? argv[argv.indexOf("--engine") + 1] : undefined;
const [vaultArg, noteArg] = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--engine");
if (!vaultArg || !noteArg) {
	console.error("usage: node check_note.mjs <vault-dir> <note.md relative to vault> [--engine latexmk|tectonic] [--no-compile]");
	process.exit(2);
}
const vault = path.resolve(vaultArg);

function fail(message) {
	console.error(`✗ ${message}`);
	process.exit(1);
}

function findCheckout(start) {
	for (let dir = start; dir !== path.dirname(dir); dir = path.dirname(dir)) {
		if (existsSync(path.join(dir, "latex-exporter", "pandoc", "template.latex"))) return dir;
	}
	return undefined;
}

function loadCore() {
	const require = createRequire(path.join(process.cwd(), "noop.js"));
	const candidates = [];
	if (process.env.LAVATEX_CORE) candidates.push(path.resolve(process.env.LAVATEX_CORE));
	candidates.push("lavatex-core");
	const checkout = findCheckout(here);
	if (checkout) candidates.push(checkout);
	for (const candidate of candidates) {
		try {
			return require(candidate);
		} catch {
			// try the next one
		}
	}
	fail(
		"Could not load lavatex-core. Set LAVATEX_CORE to a LavaTex checkout (built with `npm install && npm run build`), or `npm install github:fabsch225/LavaTex`.",
	);
}

function loadAssets() {
	const dirs = [
		path.join(vault, ".obsidian", "plugins", "latex-exporter", "pandoc"),
		process.env.LAVATEX_ASSETS,
		findCheckout(here) && path.join(findCheckout(here), "latex-exporter", "pandoc"),
	].filter(Boolean);
	for (const dir of dirs) {
		if (existsSync(path.join(dir, "template.latex"))) {
			return {
				template: readFileSync(path.join(dir, "template.latex"), "utf8"),
				luaFilter: readFileSync(path.join(dir, "theorems.lua"), "utf8"),
			};
		}
	}
	fail("Could not find the LavaTex pandoc template (template.latex / theorems.lua). Set LAVATEX_ASSETS to that folder.");
}

// Obsidian-style link resolution: exact vault path first, else the
// shortest-path note with that basename.
const notes = [];
(function walk(dir) {
	for (const name of readdirSync(dir)) {
		if (name.startsWith(".")) continue;
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) walk(full);
		else if (name.endsWith(".md")) notes.push(path.relative(vault, full).split(path.sep).join("/"));
	}
})(vault);
const ref = (p) => ({ path: p, basename: path.posix.basename(p, ".md") });
const reader = {
	read: async (note) => readFileSync(path.join(vault, note.path), "utf8"),
	resolveLink(_from, linkpath) {
		const target = linkpath.split("#")[0];
		const exact = notes.find((p) => p === target || p === `${target}.md`);
		if (exact) return ref(exact);
		const base = path.posix.basename(target);
		const matches = notes.filter((p) => path.posix.basename(p, ".md") === base).sort((a, b) => a.length - b.length);
		return matches[0] ? ref(matches[0]) : undefined;
	},
};

const notePath = noteArg.split(path.sep).join("/");
if (!notes.includes(notePath)) fail(`No note ${notePath} in ${vault}`);
const core = loadCore();
const assets = loadAssets();
const note = ref(notePath);
const raw = readFileSync(path.join(vault, notePath), "utf8");
const noteDir = path.dirname(path.join(vault, notePath));
const isProject = /^chapters:/m.test(raw.split(/^---$/m)[1] ?? "");

let latex;
try {
	const backend = core.nativePandocBackend();
	latex = isProject
		? await core.exportProjectToLatex(reader, note, raw, backend, assets, noteDir)
		: await core.exportNoteToLatex(reader, note, raw, backend, assets, noteDir);
} catch (err) {
	fail(`Export (note -> .tex) failed:\n${err.message}`);
}
const texPath = path.join(noteDir, `${note.basename}.tex`);
(await import("node:fs/promises")).writeFile(texPath, latex);
console.log(`✓ ${isProject ? "project" : "note"} exported: ${path.relative(vault, texPath)}`);

// Cheap static checks on the source the compiler won't flag clearly.
const body = raw.replace(/^---[\s\S]*?\n---\n/, "");
// pandoc's auto_identifiers for headings, approximately: "## Setup & statement" -> "setup-statement".
const headingIds = [...body.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) =>
	m[1]
		.replace(/\{#[^}]*\}\s*$/, "")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}_\-. ]/gu, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/^[^\p{L}]+/u, ""),
);
const labels = new Set([...[...body.matchAll(/\{#([^}\s]+)\}/g)].map((m) => m[1]), ...headingIds]);
const missing = [...body.matchAll(/\[[#@]([^\]\s]+)\]/g)].map((m) => m[1]).filter((l) => !labels.has(l));
if (missing.length && !isProject) {
	console.log(`! references to labels not defined in this note: ${[...new Set(missing)].join(", ")}`);
}

// Bold "headers" (alone on their line, or followed by a (title) / {#label})
// whose word isn't a declared theorem name or the proofname.
const resolved = await core.resolveFrontmatterReferences(reader, note, raw);
const info = core.getFrontmatterInfo(resolved);
const fm = info.exists ? core.parseFrontmatter(info.frontmatter) : {};
const declared = new Set(
	[...(Array.isArray(fm.theorems) ? fm.theorems : []).map((t) => t?.name), fm.proofname ?? "Proof"]
		.filter((n) => typeof n === "string")
		.map((n) => n.toLowerCase()),
);
const undeclared = [...body.matchAll(/^\*\*([^*\n]+)\*\*\s*(?:\(|\{#|$)/gm)]
	.map((m) => m[1].trim().replace(/\.$/, ""))
	.filter((name) => !declared.has(name.toLowerCase()));
if (undeclared.length && !isProject) {
	console.log(
		`! bold block headers not declared in theorems:/proofname (left as plain bold): ${[...new Set(undeclared)].join(", ")}`,
	);
}
if (/∎/.test(latex)) console.log("! a ∎ survived into the .tex — it closed no open block (stray, or its block header was not recognised)");

if (flags.has("--no-compile")) process.exit(0);

const has = (cmd) => {
	try {
		execFileSync("which", [cmd], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
};
const engine = engineArg ?? (has("latexmk") ? "latexmk" : has("tectonic") ? "tectonic" : undefined);
if (!engine) fail("Neither latexmk nor tectonic is installed — rerun with --no-compile, or install one (`brew install tectonic`).");

try {
	const pdf = await core.compileToPdf({ texPath, cwd: noteDir, engine });
	console.log(`✓ compiled with ${engine}: ${path.relative(vault, pdf)}`);
} catch (err) {
	// The first `! ...` error (with the `l.<n>` line locating it) is what matters;
	// the latexmk/tectonic console tail is mostly boilerplate.
	const logPath = texPath.replace(/\.tex$/, ".log");
	const lines = (existsSync(logPath) ? readFileSync(logPath, "utf8") : err.message).split("\n");
	let at = lines.findIndex((l) => /^! (?! ==>)/.test(l) || l.startsWith("error:"));
	if (at < 0) at = err.message.split("\n").length > 25 ? -1 : 0;
	const excerpt = at >= 0 ? lines.slice(at, at + 4) : err.message.split("\n").slice(-25);
	fail(`LaTeX compilation failed (${engine}):\n${excerpt.join("\n")}\n(line numbers refer to ${path.relative(vault, texPath)})`);
}

const logPath = texPath.replace(/\.tex$/, ".log");
if (existsSync(logPath)) {
	const log = readFileSync(logPath, "utf8");
	const undefinedRefs = [...log.matchAll(/(Reference|Citation) `([^']+)' on page \d+ undefined/g)].map((m) => `${m[1].toLowerCase()} ${m[2]}`);
	if (undefinedRefs.length) console.log(`! undefined after compiling: ${[...new Set(undefinedRefs)].join(", ")}`);
}
