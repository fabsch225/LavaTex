/**
 * Obsidian-side adapter over lavatex-core: reads the note straight off the
 * vault, hands it to the shared export logic via an `ObsidianNoteReader`,
 * and writes the result next to the note. All the actual note-syntax and
 * pandoc-orchestration logic lives in `lavatex-core` (`../../../src` in
 * this repo), not here.
 *
 * pandoc (and latexmk, for PDFs) run either locally (desktop) or on the
 * user's remote toolchain (`../remote/`) — the only way on mobile.
 */
import { normalizePath, Platform, type App, type TFile } from "obsidian";

import {
	compileToPdf,
	exportNoteToLatex as coreExportNoteToLatex,
	exportNoteToMarkdown as coreExportNoteToMarkdown,
	type LatexAssets,
	type LatexEngine,
	nativePandocBackend,
	openInDefaultApp,
	type PandocBackend,
} from "lavatex-core";

import type { RemoteResult, RemoteToolchain } from "../remote/types";
import { obsidianNoteReader } from "./obsidianNoteReader";
import { absolutePath, siblingPath } from "./paths";

export interface ExportEnv {
	app: App;
	/** Vault-relative plugin folder (`manifest.dir`), where pandoc/ lives. */
	pluginDir: string;
	/** Set to compile remotely; undefined means the local toolchain. */
	remote?: RemoteToolchain;
	engine: LatexEngine;
	onProgress: (message: string) => void;
}

export async function readLatexAssets(env: ExportEnv): Promise<LatexAssets> {
	const read = (name: string) => env.app.vault.adapter.read(normalizePath(`${env.pluginDir}/pandoc/${name}`));
	const [template, luaFilter] = await Promise.all([read("template.latex"), read("theorems.lua")]);
	return { template, luaFilter };
}

async function writeText(app: App, path: string, content: string): Promise<void> {
	const existing = app.vault.getFileByPath(path);
	if (existing) await app.vault.modify(existing, content);
	else await app.vault.create(path, content);
}

async function writeBinary(app: App, path: string, data: ArrayBuffer): Promise<TFile> {
	const existing = app.vault.getFileByPath(path);
	if (existing) {
		await app.vault.modifyBinary(existing, data);
		return existing;
	}
	return app.vault.createBinary(path, data);
}

async function openPdf(app: App, pdf: TFile): Promise<void> {
	if (Platform.isDesktopApp) {
		await openInDefaultApp(absolutePath(app, pdf.path));
	} else {
		await app.workspace.getLeaf("tab").openFile(pdf);
	}
}

const IMAGE_REFS = [/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g, /\\includegraphics\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g];
const GRAPHICS_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];

/**
 * The images a remote compile needs uploaded alongside the .tex: every
 * relative path referenced from the markdown, resolved against `folder`
 * (the same directory the local toolchain would run latexmk in).
 */
async function collectResources(app: App, folder: string, markdown: string): Promise<Record<string, ArrayBuffer>> {
	const refs = new Set<string>();
	for (const pattern of IMAGE_REFS) {
		for (const match of markdown.matchAll(pattern)) refs.add(match[1].trim());
	}

	const files: Record<string, ArrayBuffer> = {};
	for (const ref of refs) {
		if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("/") || ref.split("/").includes("..")) continue;
		let decoded = ref;
		try {
			decoded = decodeURI(ref);
		} catch {
			// keep as-is
		}
		const base = normalizePath(folder === "/" ? decoded : `${folder}/${decoded}`);
		const hasExtension = /\.[a-z0-9]+$/i.test(decoded);
		const candidates = hasExtension ? [base] : GRAPHICS_EXTENSIONS.map((ext) => base + ext);
		for (const candidate of candidates) {
			if (await app.vault.adapter.exists(candidate)) {
				const key = hasExtension ? ref : ref + candidate.slice(base.length);
				files[key] = await app.vault.adapter.readBinary(candidate);
				break;
			}
		}
	}
	return files;
}

/**
 * Runs `convert` (a lavatex-core export, given a pandoc backend) for
 * `file`, writes `<note>.tex` next to it and, when `wantPdf`, compiles and
 * opens `<note>.pdf`. Returns the vault path of the last file written.
 */
export async function buildDocument(
	env: ExportEnv,
	file: TFile,
	wantPdf: boolean,
	convert: (backend: PandocBackend, cwd?: string) => Promise<string>,
): Promise<string> {
	const { app } = env;
	const folder = file.parent?.path ?? "/";
	const texPath = siblingPath(file, "tex");

	if (!env.remote) {
		const cwd = absolutePath(app, folder);
		await writeText(app, texPath, await convert(nativePandocBackend(), cwd));
		if (!wantPdf) return texPath;
		env.onProgress("Compiling PDF…");
		const pdfAbsolute = await compileToPdf({ texPath: absolutePath(app, texPath), cwd, engine: env.engine });
		await openInDefaultApp(pdfAbsolute);
		return siblingPath(file, "pdf");
	}

	const remote = env.remote;
	let result: RemoteResult | undefined;
	const remoteBackend: PandocBackend = {
		async convert(input) {
			const { cwd: _cwd, ...pandoc } = input;
			const files = wantPdf ? await collectResources(app, folder, input.markdown + (input.headerIncludes ?? "")) : {};
			result = await remote.run({ pandoc, compile: wantPdf, engine: env.engine, files }, env.onProgress);
			return result.tex;
		},
	};
	await writeText(app, texPath, await convert(remoteBackend));
	if (!wantPdf) return texPath;
	if (!result?.pdf) throw new Error("The remote toolchain returned no PDF.");
	const pdf = await writeBinary(app, siblingPath(file, "pdf"), result.pdf);
	await openPdf(app, pdf);
	return pdf.path;
}

export async function exportNote(env: ExportEnv, file: TFile, wantPdf: boolean): Promise<string> {
	const reader = obsidianNoteReader(env.app);
	const rawText = await env.app.vault.read(file);
	const assets = await readLatexAssets(env);
	return buildDocument(env, file, wantPdf, (backend, cwd) =>
		coreExportNoteToLatex(reader, file, rawText, backend, assets, cwd),
	);
}

/** Exports the note to plain markdown — no pandoc involved (see `lavatex-core`'s `exportNoteToMarkdown`). */
export async function exportNoteToMarkdown(app: App, file: TFile): Promise<string> {
	const reader = obsidianNoteReader(app);
	const rawText = await app.vault.read(file);
	const markdown = await coreExportNoteToMarkdown(reader, file, rawText);

	const outputPath = normalizePath(
		`${file.parent && file.parent.path !== "/" ? file.parent.path + "/" : ""}${file.basename}.exported.md`,
	);
	await writeText(app, outputPath, markdown);
	return outputPath;
}
