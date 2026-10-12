/**
 * Mints Google-signed ID tokens for a private Cloud Run service from a
 * service account key, entirely in-app (WebCrypto + `requestUrl`), so it
 * works on mobile without the gcloud CLI or a browser OAuth flow.
 *
 * Flow (Google's "self-signed JWT -> ID token" exchange):
 *   1. sign a JWT with the key's RSA private key, claiming
 *      `target_audience = <service URL>`;
 *   2. POST it to Google's token endpoint, which answers with an `id_token`
 *      whose `aud` is the service URL;
 *   3. send that as `Authorization: Bearer ...` — Cloud Run verifies it and
 *      checks the identity holds `roles/run.invoker` before forwarding.
 *
 * The private key itself never leaves the device; only the signed JWT goes
 * to Google, and only the short-lived (1h) ID token goes to Cloud Run.
 */
import { requestUrl } from "obsidian";

// Hard-coded rather than read from the key file's `token_uri`, so a
// tampered key file can't redirect the signed assertion anywhere else.
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REFRESH_MARGIN_S = 120;

export interface ServiceAccountKey {
	client_email: string;
	private_key: string;
}

export function parseServiceAccountKey(json: string): ServiceAccountKey {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error("The service account key secret is not valid JSON — paste the whole key file.");
	}
	const key = parsed as Partial<ServiceAccountKey> & { type?: string };
	if (key.type !== "service_account" || typeof key.client_email !== "string" || typeof key.private_key !== "string") {
		throw new Error("The secret is not a Google service account key (expected `type: service_account`).");
	}
	return { client_email: key.client_email, private_key: key.private_key };
}

function base64url(input: string | ArrayBuffer): string {
	const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
	const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
	const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
	return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function signedAssertion(key: ServiceAccountKey, audience: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const claims = base64url(
		JSON.stringify({
			iss: key.client_email,
			sub: key.client_email,
			aud: TOKEN_ENDPOINT,
			target_audience: audience,
			iat: now,
			exp: now + 3600,
		}),
	);
	const signingInput = `${header}.${claims}`;
	const signature = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		await importPrivateKey(key.private_key),
		new TextEncoder().encode(signingInput),
	);
	return `${signingInput}.${base64url(signature)}`;
}

function expiryOf(idToken: string): number {
	try {
		const payload = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
		const exp = (JSON.parse(atob(payload)) as { exp?: number }).exp;
		if (typeof exp === "number") return exp;
	} catch {
		// fall through
	}
	return Math.floor(Date.now() / 1000) + 3000;
}

/** Caches one ID token per (service account, audience) until shortly before it expires. */
export class IdTokenProvider {
	private cached?: { cacheKey: string; token: string; exp: number };

	async getToken(key: ServiceAccountKey, audience: string): Promise<string> {
		const cacheKey = `${key.client_email}\n${audience}`;
		const now = Math.floor(Date.now() / 1000);
		if (this.cached && this.cached.cacheKey === cacheKey && this.cached.exp - REFRESH_MARGIN_S > now) {
			return this.cached.token;
		}

		const response = await requestUrl({
			url: TOKEN_ENDPOINT,
			method: "POST",
			contentType: "application/x-www-form-urlencoded",
			body: new URLSearchParams({
				grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
				assertion: await signedAssertion(key, audience),
			}).toString(),
			throw: false,
		});
		const json = (response.json ?? {}) as { id_token?: string; error?: string; error_description?: string };
		if (response.status !== 200 || !json.id_token) {
			const reason = json.error_description ?? json.error ?? `HTTP ${response.status}`;
			throw new Error(`Google rejected the service account key: ${reason}`);
		}

		this.cached = { cacheKey, token: json.id_token, exp: expiryOf(json.id_token) };
		return json.id_token;
	}

	clear(): void {
		this.cached = undefined;
	}
}
