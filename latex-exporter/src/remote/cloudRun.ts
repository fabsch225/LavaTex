/**
 * Runs exports on the user's own private Cloud Run service
 * (`remote-compiler/cloud-run/`): `/convert` for pandoc + pandoc-crossref,
 * then `/compile` for latexmk. Every request carries a Google ID token
 * minted from a service account key that holds `roles/run.invoker` on that
 * one service — see `./googleAuth.ts`.
 */
import { type App, requestUrl, type RequestUrlResponse } from "obsidian";

import type { LatexExporterSettings } from "../settings";
import { IdTokenProvider, parseServiceAccountKey } from "./googleAuth";
import { arrayBufferToBase64, type RemoteJob, type RemoteResult, type RemoteToolchain } from "./types";

export class CloudRunToolchain implements RemoteToolchain {
	private readonly tokens = new IdTokenProvider();

	constructor(
		private readonly app: App,
		private readonly settings: () => LatexExporterSettings,
	) {}

	/** The service's origin — also the ID token audience Cloud Run expects. */
	private serviceUrl(): string {
		const raw = this.settings().cloudRunUrl.trim();
		if (!raw) {
			throw new Error("Set the Cloud Run service URL in the LaTeX Exporter settings.");
		}
		let url: URL;
		try {
			url = new URL(raw);
		} catch {
			throw new Error(`Cloud Run service URL is not a valid URL: ${raw}`);
		}
		if (url.protocol !== "https:") {
			throw new Error("Cloud Run service URL must start with https://");
		}
		return url.origin;
	}

	private async authHeader(audience: string): Promise<string> {
		const secretId = this.settings().cloudRunKeySecret;
		const secret = secretId ? this.app.secretStorage.getSecret(secretId) : null;
		if (!secret) {
			throw new Error("Pick the secret holding your service account key in the LaTeX Exporter settings.");
		}
		return `Bearer ${await this.tokens.getToken(parseServiceAccountKey(secret), audience)}`;
	}

	private async call(method: "GET" | "POST", path: string, body?: unknown): Promise<RequestUrlResponse> {
		const base = this.serviceUrl();
		const response = await requestUrl({
			url: base + path,
			method,
			headers: { Authorization: await this.authHeader(base) },
			contentType: body === undefined ? undefined : "application/json",
			body: body === undefined ? undefined : JSON.stringify(body),
			throw: false,
		});
		if (response.status === 401 || response.status === 403) {
			this.tokens.clear();
			throw new Error(
				`Cloud Run refused the request (HTTP ${response.status}). Check the service URL, and that the key's service account has the Cloud Run Invoker role on the service.`,
			);
		}
		if (response.status >= 400) {
			let message = `HTTP ${response.status}`;
			try {
				const json = response.json as { error?: string; log?: string };
				message = [json.error, json.log].filter(Boolean).join("\n") || message;
			} catch {
				// non-JSON error page (e.g. from Google's front end)
			}
			throw new Error(message);
		}
		return response;
	}

	async check(): Promise<string> {
		const versions = (await this.call("GET", "/version")).json as { pandoc: string; crossref: string };
		return `Connected: ${versions.pandoc}; ${versions.crossref.split(" git")[0]}`;
	}

	async run(job: RemoteJob, onProgress: (message: string) => void): Promise<RemoteResult> {
		onProgress("Converting on Cloud Run (may take a while on a cold start)…");
		const { tex } = (await this.call("POST", "/convert", job.pandoc)).json as { tex: string };
		if (!job.compile) return { tex };

		onProgress("Compiling PDF on Cloud Run…");
		const files: Record<string, string> = { "main.tex": arrayBufferToBase64(new TextEncoder().encode(tex).buffer as ArrayBuffer) };
		for (const [path, data] of Object.entries(job.files)) files[path] = arrayBufferToBase64(data);
		const pdf = (await this.call("POST", "/compile", { main: "main.tex", engine: job.engine, files })).arrayBuffer;
		return { tex, pdf };
	}
}
