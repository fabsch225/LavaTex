/**
 * LavaTex remote compiler (Cloud Run flavour): the same pandoc +
 * pandoc-crossref + latexmk toolchain the desktop plugin shells out to,
 * behind a tiny HTTP API, so the plugin works on Obsidian mobile (which
 * can't spawn processes).
 *
 * There is deliberately no authentication code in here: the service is
 * deployed with `--no-allow-unauthenticated`, so Cloud Run's own front end
 * rejects every request that doesn't carry a Google-signed ID token for an
 * identity holding `roles/run.invoker` on this service — before it ever
 * reaches this process (see deploy.sh).
 *
 *   GET  /version   -> { pandoc, crossref, latexmk }
 *   POST /convert   { markdown, template, luaFilter, topLevelDivision?, headerIncludes?, afterBody? }
 *                   -> { tex }                         (pandoc + pandoc-crossref)
 *   POST /compile   { main: "note.tex", engine?: "latexmk" | "tectonic", files: { "<relative path>": "<base64>" } }
 *                   -> application/pdf                 (latexmk or tectonic, no shell escape)
 *
 * Failures come back as `{ error, log? }` with status 4xx/5xx.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PORT ?? 8080);
// Cloud Run caps HTTP/1 request bodies at 32 MiB anyway.
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const TIMEOUT_MS = Number(process.env.LAVATEX_TIMEOUT_MS ?? 240_000);
const TECTONIC_CACHE = path.join(os.tmpdir(), "tectonic-cache");

class HttpError extends Error {
	constructor(status, message, log) {
		super(message);
		this.status = status;
		this.log = log;
	}
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new HttpError(413, "Request body too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

async function readJson(req) {
	try {
		return JSON.parse((await readBody(req)).toString("utf8"));
	} catch (err) {
		if (err instanceof HttpError) throw err;
		throw new HttpError(400, "Body is not valid JSON");
	}
}

/** Runs `command` in its own process group, so a timeout also kills latexmk's pdflatex children. */
function run(command, args, cwd) {
	return new Promise((resolve) => {
		const proc = spawn(command, args, {
			cwd,
			detached: true,
			// Tectonic's package cache is shared across requests (per instance),
			// so only the first compile after a cold start downloads anything.
			env: { ...process.env, HOME: cwd, TEXMFVAR: path.join(cwd, ".texmf-var"), TECTONIC_CACHE_DIR: TECTONIC_CACHE },
		});
		let output = "";
		proc.stdout.on("data", (chunk) => (output += chunk));
		proc.stderr.on("data", (chunk) => (output += chunk));

		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			try {
				process.kill(-proc.pid, "SIGKILL");
			} catch {
				// already gone
			}
		}, TIMEOUT_MS);

		proc.on("error", (err) => {
			clearTimeout(timer);
			resolve({ code: -1, output: output + String(err) });
		});
		proc.on("close", (code) => {
			clearTimeout(timer);
			resolve({ code: timedOut ? -1 : code, output: timedOut ? output + `\n[timed out after ${TIMEOUT_MS} ms]` : output });
		});
	});
}

/** Resolves a client-supplied relative path inside `root`, refusing anything that escapes it. */
function safeJoin(root, relative) {
	if (typeof relative !== "string" || relative === "" || relative.includes("\0") || relative.includes("\\")) {
		throw new HttpError(400, `Invalid file path: ${JSON.stringify(relative)}`);
	}
	const resolved = path.resolve(root, relative);
	if (path.isAbsolute(relative) || !resolved.startsWith(root + path.sep)) {
		throw new HttpError(400, `File path escapes the work directory: ${JSON.stringify(relative)}`);
	}
	return resolved;
}

async function withWorkDir(fn) {
	const dir = await mkdtemp(path.join(os.tmpdir(), "lavatex-"));
	try {
		return await fn(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

function requireString(body, key, optional = false) {
	const value = body[key];
	if (value === undefined && optional) return undefined;
	if (typeof value !== "string") throw new HttpError(400, `\`${key}\` must be a string`);
	return value;
}

function tail(output, lines = 60) {
	return output.trim().split("\n").slice(-lines).join("\n");
}

/** Mirrors lavatex-core's `nativePandocBackend()` (src/pandoc/native.ts) — keep the two arg lists in sync. */
async function convert(body) {
	const markdown = requireString(body, "markdown");
	const template = requireString(body, "template");
	const luaFilter = requireString(body, "luaFilter");
	const topLevelDivision = requireString(body, "topLevelDivision", true) ?? "section";
	const headerIncludes = requireString(body, "headerIncludes", true);
	const afterBody = requireString(body, "afterBody", true);
	if (!/^[a-z-]+$/.test(topLevelDivision)) throw new HttpError(400, "Invalid `topLevelDivision`");

	return withWorkDir(async (dir) => {
		await writeFile(path.join(dir, "input.md"), markdown);
		await writeFile(path.join(dir, "template.latex"), template);
		await writeFile(path.join(dir, "filter.lua"), luaFilter);
		const args = [
			"input.md",
			"--from=markdown-latex_macros+lists_without_preceding_blankline",
			"--template",
			"template.latex",
			"--lua-filter",
			"filter.lua",
			"--filter",
			"pandoc-crossref",
			`--top-level-division=${topLevelDivision}`,
			"-o",
			"output.tex",
		];
		if (headerIncludes) {
			await writeFile(path.join(dir, "header.tex"), headerIncludes);
			args.push("--include-in-header=header.tex");
		}
		if (afterBody) {
			await writeFile(path.join(dir, "afterbody.tex"), afterBody);
			args.push("--include-after-body=afterbody.tex");
		}

		const { code, output } = await run("pandoc", args, dir);
		if (code !== 0) throw new HttpError(422, tail(output, 20) || `pandoc exited with code ${code}`);
		return { tex: await readFile(path.join(dir, "output.tex"), "utf8") };
	});
}

async function compile(body) {
	const main = requireString(body, "main");
	if (!main.endsWith(".tex")) throw new HttpError(400, "`main` must name a .tex file");
	const engine = requireString(body, "engine", true) ?? "latexmk";
	if (engine !== "latexmk" && engine !== "tectonic") throw new HttpError(400, "`engine` must be latexmk or tectonic");
	const files = body.files;
	if (typeof files !== "object" || files === null || !(main in files)) {
		throw new HttpError(400, "`files` must be an object containing `main`");
	}

	return withWorkDir(async (dir) => {
		for (const [relative, base64] of Object.entries(files)) {
			if (typeof base64 !== "string") throw new HttpError(400, `File ${relative} must be base64`);
			const target = safeJoin(dir, relative);
			await mkdir(path.dirname(target), { recursive: true });
			await writeFile(target, Buffer.from(base64, "base64"));
		}
		const mainPath = safeJoin(dir, main);
		const { code, output } =
			engine === "tectonic"
				? await run("tectonic", [path.basename(mainPath)], path.dirname(mainPath))
				: await run(
						"latexmk",
						["-pdf", "-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape", path.basename(mainPath)],
						path.dirname(mainPath),
					);
		if (code !== 0) {
			throw new HttpError(422, "LaTeX compilation failed", tail(output));
		}
		return readFile(mainPath.replace(/\.tex$/, ".pdf"));
	});
}

async function version() {
	const first = async (cmd, args) => (await run(cmd, args, os.tmpdir())).output.split("\n")[0].trim();
	return {
		pandoc: await first("pandoc", ["--version"]),
		crossref: await first("pandoc-crossref", ["--version"]),
		latexmk: await first("latexmk", ["--version"]).then((s) => s || "latexmk"),
		tectonic: await first("tectonic", ["--version"]),
	};
}

function send(res, status, payload) {
	if (Buffer.isBuffer(payload)) {
		res.writeHead(status, { "Content-Type": "application/pdf", "Content-Length": payload.length });
		res.end(payload);
		return;
	}
	const json = JSON.stringify(payload);
	res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
	res.end(json);
}

const server = http.createServer(async (req, res) => {
	try {
		const route = `${req.method} ${new URL(req.url ?? "/", "http://x").pathname}`;
		switch (route) {
			case "GET /version":
				return send(res, 200, await version());
			case "POST /convert":
				return send(res, 200, await convert(await readJson(req)));
			case "POST /compile":
				return send(res, 200, await compile(await readJson(req)));
			default:
				throw new HttpError(404, `No route for ${route}`);
		}
	} catch (err) {
		const status = err instanceof HttpError ? err.status : 500;
		if (status === 500) console.error(err);
		send(res, status, { error: err instanceof Error ? err.message : String(err), log: err.log });
	}
});

server.requestTimeout = TIMEOUT_MS + 30_000;
server.listen(PORT, () => console.log(`lavatex remote compiler listening on :${PORT}`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
