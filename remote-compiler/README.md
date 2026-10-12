# Remote compilation (Obsidian mobile)

Obsidian on Android and iOS can't run `pandoc` or `latexmk`, so on mobile the
LaTeX Exporter sends each export to a **toolchain you own**. It runs pandoc,
pandoc-crossref and latexmk there, and the plugin writes `<note>.tex` and
`<note>.pdf` back into your vault next to the note, the same as on desktop.
You can also use this on desktop if you don't want to install TeX locally
(Settings → LaTeX Exporter → *Compile with* → *Remote backend*).

There are two backends. Both run in your own account and accept requests
only from you:

|                     | GitHub Actions (default)                                | Google Cloud Run                                                     |
| ------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| You need            | a GitHub account                                        | a Google Cloud project with billing enabled                          |
| Time per PDF        | ~30 s with Tectonic (cached), ~2–3 min with latexmk     | seconds when warm, ~30 s+ on a cold start                            |
| Cost                | free within your private-repo Actions minutes (2,000/month on GitHub Free) | usually free tier, pay-per-use beyond it                             |
| Credential on phone | fine-grained token for **one** repository               | service account key that can **only invoke one** Cloud Run service   |

If you're unsure, start with GitHub Actions. It takes about five minutes to
set up.

### LaTeX engine: latexmk or Tectonic

Settings → LaTeX Exporter → **LaTeX engine** applies to local and remote
compilation alike:

- **latexmk (pdfLaTeX)**: the classic toolchain. Remotely it runs in the
  full TeX Live image, which on GitHub Actions means pulling ~5 GB on
  every run (~2–3 min per PDF). Locally it needs MacTeX/TeX Live.
- **Tectonic (XeTeX)**: a ~30 MB engine that downloads only the packages
  a document uses and caches them. On GitHub Actions the cache is kept
  between runs (one small entry, re-saved only when a new package is
  needed), so after the first run a PDF takes ~30 s. Locally,
  `brew install tectonic` is all you need instead of MacTeX.

Tectonic is XeTeX-based, so a preamble that relies on pdfLaTeX-only
behaviour can come out differently. The bundled template and all the
`examples/` notes compile identically under both engines. Its package
snapshot also lags the newest TeX Live a little, and it needs network
access the first time a package is used, so on GitHub the Tectonic
compile isn't network-isolated the way the latexmk container is. Shell
escape stays off either way.

---

## Option A — GitHub Actions

### 1. Create a private repository

```sh
gh repo create lavatex-compile --private --add-readme
```

(or <https://github.com/new>, with **Private** selected). It **must be
private**. Every job contains your note's full text, and the plugin refuses
to use a public repository.

### 2. Add the workflow

Copy [`github-actions/lavatex.yml`](github-actions/lavatex.yml) from this
repository to `.github/workflows/lavatex.yml` in the new repository, on its
default branch:

```sh
gh repo clone lavatex-compile && cd lavatex-compile
mkdir -p .github/workflows
cp /path/to/LavaTex/remote-compiler/github-actions/lavatex.yml .github/workflows/
git add .github && git commit -m "Add LavaTex compile workflow" && git push
```

### 3. Create a fine-grained access token

GitHub → **Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token**:

- **Expiration:** your choice (e.g. 90 days); you'll paste a new one when it expires.
- **Repository access:** *Only select repositories* → `lavatex-compile`.
- **Repository permissions:**
  - **Actions:** Read and write (to start the workflow and watch it)
  - **Contents:** Read and write (to upload the job and read the PDF back)
  - *Metadata: Read-only* is added automatically.
- Leave everything else at *No access*.

Don't use a classic token. Those can't be limited to one repository.

### 4. Configure the plugin (on every device)

Settings → **LaTeX Exporter**:

1. **Remote backend:** GitHub Actions
2. **Repository:** `your-username/lavatex-compile`
3. **GitHub token:** create a secret (e.g. `lavatex-github`) and paste the token.
4. **Test connection.** It should report that the private repo is reachable and the workflow is active.

Now run *Export current note to PDF* on your phone. A notice shows progress,
and the PDF opens in Obsidian when it's done.

### What happens on each export

1. The plugin creates a branch `lavatex-job-…` containing a single
   `job.json` file: the preprocessed markdown, the LaTeX template and Lua
   filter, and any images the note links to.
2. It starts the `LavaTex compile` workflow for that branch.
3. The workflow runs pandoc + pandoc-crossref, then either latexmk inside
   the `texlive/texlive:latest-full` container (**no network**, **no shell
   escape**) or Tectonic (no shell escape, packages from the Actions
   cache). The results are committed back onto the job branch.
4. The plugin downloads `main.tex` / `main.pdf` and **deletes the branch**.

The run's logs stay in the repository's *Actions* tab (90 days by default;
you can shorten this under *Settings → Actions → General → Artifact and log
retention*), which is useful when a compile fails.

---

## Option B — Google Cloud Run

The plugin talks to a private Cloud Run service built from
[`cloud-run/`](cloud-run/). The service is deployed with
`--no-allow-unauthenticated`, so Google's front end rejects any request
that doesn't carry a valid ID token for an identity granted *Cloud Run
Invoker* on that one service. Unauthenticated requests never reach the
container and don't cost you anything.

### 1. Install and log in to the gcloud CLI

```sh
brew install --cask gcloud-cli        # macOS; see https://cloud.google.com/sdk/docs/install otherwise
gcloud auth login
```

### 2. Create a project with billing

```sh
gcloud projects create my-lavatex --name "LavaTex"
gcloud billing accounts list
gcloud billing projects link my-lavatex --billing-account XXXXXX-XXXXXX-XXXXXX
```

Consider adding a budget alert (Billing → Budgets & alerts). The service
scales to zero and is capped at 2 instances, so idle cost is nil.

### 3. Deploy

```sh
PROJECT_ID=my-lavatex REGION=europe-west1 ./cloud-run/deploy.sh
```

The script:

- enables the Cloud Run / Cloud Build / IAM APIs;
- creates `lavatex-runtime`, the identity the container runs as, with **no
  roles at all**;
- creates `lavatex-client`, the identity the plugin uses. Its **only**
  permission is `roles/run.invoker` on this one service, with nothing
  project-wide;
- builds the image with Cloud Build (full TeX Live, so the first build
  takes ~10 min) and deploys it privately;
- writes a key for `lavatex-client` to `~/lavatex-client-key.json` (mode 600)
  and prints the service URL.

### 4. Configure the plugin (on every device)

Settings → **LaTeX Exporter**:

1. **Remote backend:** Google Cloud Run
2. **Service URL:** the `https://…run.app` URL the script printed
3. **Service account key:** create a secret (e.g. `lavatex-gcp`) and paste
   the **entire** contents of `lavatex-client-key.json`
4. **Test connection.** It should report the pandoc / pandoc-crossref versions.

Then **delete the key file** from your computer: `rm ~/lavatex-client-key.json`.

The plugin signs a short-lived JWT with the key on the device and exchanges
it at Google for a 1-hour ID token. Only that ID token is sent to Cloud
Run. The private key never leaves the device.

---

## Security notes

- **Where the credential lives.** The token / key is stored in Obsidian's
  secret storage, not in the plugin's `data.json`. It therefore doesn't end
  up in vault backups, git, or anything else that syncs the `.obsidian`
  folder as files. Expect to enter it once per device.
- **What a leaked credential allows.** A leaked GitHub token gives
  read/write access to `lavatex-compile` and its Actions, and nothing else
  on your account. A leaked Cloud Run key can invoke the compile service,
  and nothing else in the project. In either case:
  - GitHub: revoke the token under *Fine-grained tokens* and create a new one.
  - Cloud Run: `gcloud iam service-accounts keys list --iam-account lavatex-client@PROJECT.iam.gserviceaccount.com`,
    then `gcloud iam service-accounts keys delete KEY_ID --iam-account …`, and rerun
    `deploy.sh` to issue a fresh key (delete `~/lavatex-client-key.json` first).
- **Your notes leave the device.** They go to GitHub or Google, inside your
  own private repository or project. Don't use remote compilation for
  material that must not leave the device.
- **The compile environment is yours alone.** Since only you can submit
  jobs, the template and Lua filter are trusted input. LaTeX itself still
  runs with shell escape disabled (and, on GitHub, with no network).

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| "…is public — LavaTex only compiles in a private repository" | Make the repo private (Settings → General → Danger Zone) or use another one. |
| GitHub `403`/`404` | Wrong `owner/name`, or the token is missing *Actions* or *Contents* read/write on that repo. |
| "GitHub never started the workflow run" | The workflow file isn't on the default branch, or Actions is disabled for the repo (Settings → Actions). |
| "LaTeX compilation failed — see https://github.com/…" | A real LaTeX error. The notice shows the log tail; the linked run has the full log. |
| Cloud Run `403` | The URL is wrong, or `lavatex-client` lacks *Cloud Run Invoker*. Rerun `deploy.sh`, which is idempotent. |
| `deploy.sh` fails in Cloud Build with a permission error | Newer projects may need `gcloud projects add-iam-policy-binding PROJECT --member serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com --role roles/run.builder`. |
| `keys create` fails: "Key creation is not allowed" | Your organisation enforces `iam.disableServiceAccountKeyCreation`. Use the GitHub Actions backend instead. |
| Images missing from the PDF | Only images linked with a relative path (`![](figures/x.png)` or `\includegraphics{figures/x}`) next to the note are uploaded. |

## Keeping versions in sync

pandoc-crossref is built against one exact pandoc version. Both
`github-actions/lavatex.yml` and `cloud-run/Dockerfile` pin
`PANDOC_VERSION` / `CROSSREF_VERSION`. Bump them together, to the pandoc
version listed in the crossref release notes. `TECTONIC_VERSION` is
pinned in the same two places. Bumping it starts a fresh package cache on
GitHub, because the cache key includes the version.
