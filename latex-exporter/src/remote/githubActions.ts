/**
 * Runs exports on GitHub Actions in the user's own private repository, which
 * holds `remote-compiler/github-actions/lavatex.yml` as its workflow:
 *
 *   1. commit `job.json` as the sole file of a fresh orphan branch
 *      `lavatex-job-<id>` (Git Data API — no clone needed);
 *   2. dispatch the workflow (from the default branch) with `job=<branch>`;
 *   3. find the run by its `run-name`, poll until it completes;
 *   4. read `result/` back off the job branch, then delete the branch.
 *
 * Auth is a fine-grained personal access token limited to that one repo
 * (Contents + Actions read/write), kept in Obsidian's secret storage.
 */
import { type App, requestUrl, type RequestUrlResponse } from "obsidian";

import type { LatexExporterSettings } from "../settings";
import { arrayBufferToBase64, type RemoteJob, type RemoteResult, type RemoteToolchain } from "./types";

const API = "https://api.github.com";
const POLL_MS = 4000;
const FIND_RUN_TIMEOUT_MS = 120_000;
const RUN_TIMEOUT_MS = 20 * 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface WorkflowRun {
	id: number;
	display_title: string;
	status: string;
	conclusion: string | null;
	html_url: string;
}

export class GitHubActionsToolchain implements RemoteToolchain {
	constructor(
		private readonly app: App,
		private readonly settings: () => LatexExporterSettings,
	) {}

	private repo(): string {
		const repo = this.settings().githubRepo.trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
		if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
			throw new Error("Set the GitHub repository (owner/name) in the LaTeX Exporter settings.");
		}
		return repo;
	}

	private workflow(): string {
		return encodeURIComponent(this.settings().githubWorkflow.trim() || "lavatex.yml");
	}

	private token(): string {
		const id = this.settings().githubTokenSecret;
		const token = id ? this.app.secretStorage.getSecret(id) : null;
		if (!token) {
			throw new Error("Pick the secret holding your GitHub token in the LaTeX Exporter settings.");
		}
		return token.trim();
	}

	private async api(
		method: string,
		path: string,
		body?: unknown,
		accept = "application/vnd.github+json",
	): Promise<RequestUrlResponse> {
		const response = await requestUrl({
			url: `${API}/repos/${this.repo()}${path}`,
			method,
			headers: {
				Authorization: `Bearer ${this.token()}`,
				Accept: accept,
				"X-GitHub-Api-Version": "2022-11-28",
			},
			contentType: body === undefined ? undefined : "application/json",
			body: body === undefined ? undefined : JSON.stringify(body),
			throw: false,
		});
		if (response.status >= 400) {
			let message = "";
			try {
				message = (response.json as { message?: string }).message ?? "";
			} catch {
				// not JSON
			}
			if (response.status === 401) {
				throw new Error("GitHub rejected the token (expired or revoked?).");
			}
			if (response.status === 403 || response.status === 404) {
				throw new Error(
					`GitHub: ${method} ${path.split("?")[0]} -> ${response.status} ${message}. Check the repository name and that the token has Contents + Actions read/write on it.`,
				);
			}
			throw new Error(`GitHub: ${method} ${path.split("?")[0]} -> ${response.status} ${message}`);
		}
		return response;
	}

	/** Refuses public repos: job branches and run logs contain the document. */
	private async defaultBranch(): Promise<string> {
		const repo = (await this.api("GET", "")).json as { private: boolean; default_branch: string };
		if (!repo.private) {
			throw new Error(`${this.repo()} is public — LavaTex only compiles in a private repository, since jobs contain your notes.`);
		}
		return repo.default_branch;
	}

	async check(): Promise<string> {
		await this.defaultBranch();
		const wf = (await this.api("GET", `/actions/workflows/${this.workflow()}`)).json as { state: string; path: string };
		if (wf.state !== "active") {
			throw new Error(`Workflow ${wf.path} is ${wf.state} — enable it in the repo's Actions tab.`);
		}
		return `Connected to private repo ${this.repo()}, workflow ${wf.path} is active.`;
	}

	async run(job: RemoteJob, onProgress: (message: string) => void): Promise<RemoteResult> {
		onProgress("Uploading job to GitHub…");
		const ref = await this.defaultBranch();
		const branch = `lavatex-job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

		const files: Record<string, string> = {};
		for (const [path, data] of Object.entries(job.files)) files[path] = arrayBufferToBase64(data);
		const payload = JSON.stringify({ pandoc: job.pandoc, compile: job.compile, engine: job.engine, files });

		const blob = (await this.api("POST", "/git/blobs", { content: payload, encoding: "utf-8" })).json as { sha: string };
		const tree = (
			await this.api("POST", "/git/trees", { tree: [{ path: "job.json", mode: "100644", type: "blob", sha: blob.sha }] })
		).json as { sha: string };
		const commit = (await this.api("POST", "/git/commits", { message: "LavaTex job", tree: tree.sha, parents: [] }))
			.json as { sha: string };
		await this.api("POST", "/git/refs", { ref: `refs/heads/${branch}`, sha: commit.sha });

		try {
			await this.api("POST", `/actions/workflows/${this.workflow()}/dispatches`, { ref, inputs: { job: branch } });
			const run = await this.waitForRun(branch, onProgress);
			return await this.readResult(branch, run);
		} finally {
			await this.api("DELETE", `/git/refs/heads/${branch}`).catch((err) => console.warn("LavaTex: could not delete job branch", err));
		}
	}

	private async waitForRun(branch: string, onProgress: (message: string) => void): Promise<WorkflowRun> {
		const title = `lavatex ${branch}`;
		const started = Date.now();
		let run: WorkflowRun | undefined;

		onProgress("Waiting for GitHub Actions to pick up the job…");
		while (!run) {
			if (Date.now() - started > FIND_RUN_TIMEOUT_MS) {
				throw new Error("GitHub never started the workflow run. Check the repo's Actions tab (are Actions enabled?).");
			}
			await sleep(POLL_MS);
			const list = (
				await this.api("GET", `/actions/workflows/${this.workflow()}/runs?event=workflow_dispatch&per_page=20`)
			).json as { workflow_runs: WorkflowRun[] };
			run = list.workflow_runs.find((candidate) => candidate.display_title === title);
		}

		while (run.status !== "completed") {
			if (Date.now() - started > RUN_TIMEOUT_MS) {
				throw new Error(`Timed out waiting for ${run.html_url}`);
			}
			onProgress(`GitHub Actions: ${run.status.replace(/_/g, " ")} (${Math.round((Date.now() - started) / 1000)}s)…`);
			await sleep(POLL_MS);
			run = (await this.api("GET", `/actions/runs/${run.id}`)).json as WorkflowRun;
		}
		return run;
	}

	private async readFile(branch: string, path: string): Promise<RequestUrlResponse | undefined> {
		try {
			return await this.api("GET", `/contents/${path}?ref=${encodeURIComponent(branch)}`, undefined, "application/vnd.github.raw+json");
		} catch {
			return undefined;
		}
	}

	private async readResult(branch: string, run: WorkflowRun): Promise<RemoteResult> {
		const status = (await this.readFile(branch, "result/status"))?.text.trim();
		if (!status) {
			throw new Error(`The workflow failed before producing a result (${run.conclusion}): ${run.html_url}`);
		}
		if (status !== "ok") {
			const log = (await this.readFile(branch, "result/log.txt"))?.text ?? "";
			const what = status === "pandoc-failed" ? "pandoc failed" : status === "latex-failed" ? "LaTeX compilation failed" : status;
			throw new Error(`${what} — see ${run.html_url}\n${relevantLogLines(log)}`);
		}
		const tex = (await this.readFile(branch, "result/main.tex"))?.text;
		if (tex === undefined) throw new Error(`Run succeeded but produced no main.tex: ${run.html_url}`);
		const pdf = (await this.readFile(branch, "result/main.pdf"))?.arrayBuffer;
		return { tex, pdf };
	}
}

/** TeX's own `! ...` error (with the lines locating it) if there is one, else the log's tail. */
function relevantLogLines(log: string): string {
	const lines = log.trim().split("\n");
	const errorAt = lines.findIndex((line) => line.startsWith("! "));
	return errorAt >= 0 ? lines.slice(errorAt, errorAt + 6).join("\n") : lines.slice(-20).join("\n");
}
