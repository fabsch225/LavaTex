# LavaTex

An opinionated Obsidian plugin (`latex-exporter/`) that exports a note to
production-ready LaTeX. All real export logic sits on top of `pandoc` +
`pandoc-crossref`; nothing here re-implements what they already do (no
regex-patching of pandoc's output, no hand-rolled LaTeX writer).

See **[fabsch225.github.io/LavaTex](https://fabsch225.github.io/LavaTex/)**
for the architecture (with diagrams) and the full markdown-spec reference.
Its source is `site/*.md`; the site itself is built and deployed by
`.github/workflows/pages.yml` on every push — nothing pre-built is checked
into this repo.

## `lavatex-core` (npm package)

The note-syntax -> LaTeX/Markdown conversion logic above — everything except
the Obsidian-specific UI/commands — is its own package, `lavatex-core`,
rooted at this repo's top level (`package.json`/`src/`/`test/`) with no
dependency on the `obsidian` API. `latex-exporter/` depends on it locally via
`"lavatex-core": "file:.."`.

It's not published to npm; install it straight from GitHub:

```
npm install github:fabsch225/LavaTex
```

Two ways to turn preprocessed markdown into LaTeX:

- `nativePandocBackend()` (the default, from the package's main entry point)
  shells out to a real `pandoc` + `pandoc-crossref` install on `PATH` — same
  requirement as the Obsidian plugin above.
- `wasmPandocBackend()` (`import { wasmPandocBackend } from "lavatex-core/wasm"`)
  runs pandoc in-process via the WASM binary the
  [`pandoc-web`](https://github.com/synyx/pandoc-web) demo bundles (the
  `pandoc-wasm` package) — no native install required, at the cost of
  `pandoc-crossref` cross-reference support (a separate Haskell binary with
  no WASM build). It's an opt-in peer dependency: `npm install pandoc-wasm`
  only if you use it — plain `npm install`ing `lavatex-core` never pulls in
  its ~60MB binary.

`exportNoteToMarkdown` needs neither backend — it's pandoc-free by design
(see "Export plain Markdown" below).

Run `lavatex-core`'s own unit tests with `npm test` from the repo root.

## Install

1. Every push to `main` publishes a [GitHub release](https://github.com/fabsch225/LavaTex/releases)
   of the plugin (`.github/workflows/release.yml`). To install or update
   it, put [`update-lavatex.sh`](latex-exporter/update-lavatex.sh) (also
   attached to every release) in your vault's root folder and run
   `sh update-lavatex.sh` — it downloads the newest release into
   `.obsidian/plugins/latex-exporter/`, keeping your plugin settings. Then
   enable (or reload) the plugin in Obsidian's community plugins list.

   From source instead: `cd latex-exporter && npm install && npm run build`,
   then copy `latex-exporter/` (manifest.json, main.js, pandoc/) into
   `<vault>/.obsidian/plugins/`.
2. Release versions are `<major>.<minor>` from `latex-exporter/manifest.json`
   plus the commit count as patch — bump major/minor there by hand for
   bigger changes.
3. Requires `pandoc` and `pandoc-crossref` on `PATH`
   (`brew install pandoc pandoc-crossref`).
4. "Export current note to PDF" additionally requires a LaTeX engine on
   `PATH`, picked under Settings → LaTeX Exporter → *LaTeX engine*:
   - `latexmk` (default, pdfLaTeX) from a LaTeX distribution, e.g.
     `brew install --cask mactex-no-gui`, or any TeX Live/MiKTeX install;
   - or [Tectonic](https://tectonic-typesetting.github.io/)
     (`brew install tectonic`), a small XeTeX-based engine that downloads
     only the packages a document uses, on first use.
5. **Mobile (Android/iOS), or desktop without a local TeX install:** steps
   3–4 are replaced by a remote toolchain you own — a private GitHub repo
   running a GitHub Actions workflow (default), or a private Google Cloud
   Run service. Setup guide: [`remote-compiler/README.md`](remote-compiler/README.md).
   The plugin folder (`manifest.json`, `main.js`, `pandoc/`) has to reach
   the phone's vault too, e.g. via Obsidian Sync or your usual vault sync.

## Claude skill

`skills/lavatex/` is a [Claude skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
for writing notes in this syntax: the rules, a worked example, and
`scripts/check_note.mjs`, which runs a note through the real export pipeline
(lavatex-core → pandoc → latexmk/Tectonic) and reports mistakes. For Claude
Code, link it into your skills folder:

```
ln -s "$PWD/skills/lavatex" ~/.claude/skills/lavatex
```

For claude.ai, zip the `skills/lavatex/` folder and upload it under
Settings → Capabilities → Skills. The checker needs a local pandoc there,
so expect only the writing rules to apply.

## Worked examples

`examples/` is itself an Obsidian vault — open it directly to see (and
export) real notes, not just prose describing the spec:

- `examples/weierstrass.md` — a single note (definitions, lemmas, a proof,
  citations), the shared `preamble`/`macros`/`theorems` files it references
  living in `examples/Util/`.
- `examples/snake-lemma.md` — another single note, this time with its own
  inline frontmatter, a `tikz` commutative diagram, and a full proof by
  diagram chase (theorem/equation cross-references, citations, the works).
- `examples/elliptic-curve-associativity.md` — a transcribed paper with a
  heavier custom `preamble:` (German `babel`, a custom `\newtheoremstyle`,
  `listings` with a hand-defined syntax-highlighting style), a `Satz`/
  `Lemma`/`Korollar` theorem set sharing one counter (via `theorems:`'s
  `id`/`name` split — the environment stays `theorem`/`lemma`/`kor`
  internally, but the word you bold is the German name), a nested
  multi-step proof, and a ` ```python ``` ` code sample.
- `examples/GBM-Thesis/` — a real, 9-chapter Bachelor's thesis, demonstrating
  **Export project to LaTeX/PDF**: a master note (`thesis-project.md`)
  assembling chapter notes into one document with shared numbering and a
  table of contents.
- `examples/.obsidian/plugins/obsidian-tikzjax/` — vendored and enabled, so
  ` ```tikz ``` ` blocks (both the ones above and any you add) render live
  in the editor, not just after export.

## Usage

Twelve commands, all in the command palette:

- **Export current note to LaTeX** — writes `<note>.tex` next to the note.
- **Export current note to PDF** — does the above, then runs `latexmk` on
  the result and opens the compiled `<note>.pdf` in your OS's default
  viewer.
- **Export project to LaTeX** / **Export project to PDF** — the same, but for
  a *master* note whose frontmatter has a `chapters:` list of `[[wikilinks]]`
  to other notes, assembled into one `\documentclass{report}` document
  (chapters, shared bibliography/theorem numbering, table of contents,
  `\appendix` support) instead of one `.tex` per note. Only appear in the
  command palette when the active note actually has a `chapters:` field —
  see "Multi-chapter projects" below.
- **Export plain Markdown** — writes `<note>.exported.md`. Doesn't involve
  pandoc at all (unlike every other export target): bold-statement headers,
  `$$...$$` math, and `\begin{align}` are already valid, readable markdown,
  so they're left exactly as written. What this command actually does:
  - `&[[Source]]` citations become a native Markdown footnote reference
    `[^marker]` (the source's `\bibitem[marker]{...}` short label, or a
    running number), with a matching `[^marker]: ...` definition collected
    at the end of the document — not a raw `\cite{}` span.
  - Plain `[[wikilinks]]` (not citations) become just their display text —
    a knowledge-graph link between notes has no meaning to a standalone
    file.
  - The `∎` block terminator and `` `...`{=latex} `` raw-LaTeX wrapper
    syntax are stripped (the LaTeX itself is kept where there's no plain
    equivalent, e.g. a local `\newcommand` — just not the pandoc fence
    noise around it).
  - Every `macros:` invocation is expanded inline to its definition instead
    of being dumped as a math block — the exported math is self-contained,
    with no custom command a plain reader wouldn't understand.
  - Theorem-like headers and labelled equations are stamped with their
    resolved number — the same counting `\newtheorem{...}[counter]`/
    `\numberwithin{equation}{...}` would do at LaTeX-compile time, done by
    hand here instead — and every `[#label]`/`[@eq:label]` reference to one
    is replaced with that number (bare for `[#label]`, parenthesized for
    `[@eq:label]`), instead of being left as an unresolved `\ref{}`. A
    `[#label]` to anything else (a figure) has no equivalent counting pass
    yet and is left as-is — an honest limitation, not a bug.
  - Frontmatter is trimmed to `title`/`author`/`date`; `preamble`,
    `theorems`, and LaTeX layout knobs have no meaning here.
- **Clean up** — moves everything the exports left next to the current
  note to the trash (system trash, else the vault's `.trash`): `.tex`,
  `.pdf`, `.exported.md` and LaTeX's auxiliary files (`.aux`, `.log`,
  `.fls`, `.fdb_latexmk`, `.out`, `.toc`, `.synctex.gz`, …). The note
  itself and anything else in the folder (images) stay.
- **Insert reference to label** — fuzzy-searches every `{#label}` in the
  current note (theorem headers and labelled equations alike) and inserts
  a `[#label]` shortcut at the cursor.
- **Reference equation** — the same picker, filtered to equation labels
  (`eq:...`) only, inserting pandoc-crossref's `[@eq:...]` instead — renders
  as `\eqref{}` rather than plain `\ref{}` (see "Cross-references" below).
- **Add equation label** — prompts for a name and inserts `{#eq:name}` at
  the cursor (place it right after a `$$...$$` block's closing `$$`).
- **Add theorem label** — prompts for a name and inserts `{#name}` at the
  cursor (place it in a bold-statement header, e.g. after the `(title)`).
- **Insert environment end mark (∎)** — inserts `∎`, the bold-statement
  block terminator (see below). Worth binding a hotkey to.
- **Insert raw LaTeX** — prompts for a snippet (e.g. `\ohnebew`) and inserts
  it at the cursor as `` `\ohnebew`{=latex} ``, pandoc's raw-inline syntax:
  passed through to the exported `.tex` completely unmodified.
- Math macros (frontmatter `macros:` and body-local `\newcommand`s) register
  with Obsidian's live renderer automatically — nothing to invoke.

## Architecture

The plugin is split by concern, so the "make it pretty in Obsidian" code
never touches the "make correct LaTeX" code:

```
src/
  latex/
    theoremEnvironments.ts      frontmatter -> {trigger word: env id}    (pure)
    theoremBlockPreprocessor.ts bold-statement block -> pandoc fenced div (pure)
    rawEnvironments.ts          $$\begin{align}...\end{align}$$ -> {=latex} raw block (pure)
    tikzBlocks.ts               ```tikz``` block (+ optional Figure: caption) -> {=latex} raw block (pure)
    codeBlocks.ts               ```<lang>``` block (any tag but tikz) -> raw lstlisting environment (pure)
    referenceShortcuts.ts       [#label] -> raw \ref{label} span         (pure)
    inlineMacros.ts             \newcommand in body {=latex} blocks -> text (pure)
    labelCollector.ts           note text -> every {#label} + context    (pure)
    markdownNormalizer.ts       strip ∎/{=latex} noise for the plain-markdown export (pure)
    wikilinks.ts                [[wikilink]] -> its display text, every export target (pure)
    macroExpansion.ts           \newcommand definitions -> inline expansion, plain-markdown export (pure)
    markdownNumbering.ts        theorem/equation counting + [#label] -> resolved number, plain-markdown export (pure)
  obsidian-math/
    mathJaxMacros.ts           feed macros: text to Obsidian's live MathJax renderer
  export/
    paths.ts                   vault/plugin filesystem paths
    pathEnv.ts                 PATH augmentation shared by pandoc.ts/latex.ts
    frontmatterRefs.ts         resolve [[wikilink]] frontmatter fields to referenced notes
    citations.ts               &[[Source]] -> raw \cite{key} span + assembled bibliography-raw
    markdownCitations.ts       &[[Source]] -> [^marker] footnote + definition (markdown export)
    rawLatexFrontmatter.ts     preamble:/macros:/bibliography-raw: -> --include-in-header/-after-body files, not template vars
    pandoc.ts                  spawn pandoc with the fixed flag set (LaTeX export only)
    latex.ts                   spawn latexmk to compile PDF, open it
    exporter.ts                orchestrates the preprocessing passes + pandoc/latexmk/markdown
    project.ts                 multi-chapter assembly: chapters: [[wikilinks]] -> one pandoc pass
  ui/
    ReferenceSuggestModal.ts   fuzzy picker for the reference-insertion commands
    PromptModal.ts             single-line text prompt (raw LaTeX, equation/theorem labels)
  main.ts                      wires commands + events to the pieces above
```

`latex/*` is pure text-in/data-out — no Obsidian API calls, easy to test
standalone. `obsidian-math/`, `export/`, and `ui/` are the places that talk
to the outside world (the live editor, the pandoc subprocess, and modal UI,
respectively), and none of them know about each other.

The `pandoc/theorems.lua` Lua filter (fenced-div -> `\begin{env}`) does all
the LaTeX-environment work; `theoremBlockPreprocessor.ts` only normalizes
the note's markdown into the fenced-div syntax that filter already
understands. Two small, single-purpose transforms instead of one that does
both jobs.

Fenced-div attribute values (like a header's `title="..."`) are plain
strings pandoc never reparses as markdown, so a raw-inline span inside one
(a citation's `` `\cite{key}`{=latex} ``, say) would otherwise land in the
`.tex` completely literally. `theorems.lua` round-trips the title through
`pandoc.read`/`pandoc.write` before splicing it in, so it renders exactly
like ordinary body text would.

## Markdown spec

Equations are numbered per section; everything else about the preamble is
frontmatter-driven — there's no hardcoded package list baked into the
plugin. `examples/Util/preamble.md` is a suggested opinionated default
(`mathtools`, `amssymb`, `amsthm`, `mathrsfs`, `bbm`, `bm`, `hyperref`
with blue links, `setspace`, `enumitem`), not a requirement.

Per-document YAML frontmatter:

- `title`, `author`, `date`, `fontsize`, `margin`, `linestretch`
- `refname`, `proofname` — German by default in examples, override per note.
  `proofname`'s value also doubles as the word you bold to start a proof
  (see below).
- `preamble`: literal LaTeX (`\usepackage...`), inserted into the preamble
  right after `\documentclass`/`geometry`/`inputenc` — this is where the
  opinionated package list lives now (see `examples/Util/preamble.md`).
- `theorems`: list of `{id, name, counter}` (new counter) or `{id, name, like}`
  (shares a counter). `id` becomes the `\newtheorem`/environment name;
  `name` is the word you bold in the note to start one.
- `macros`: literal LaTeX (`\newcommand...`), inserted verbatim into the
  preamble *and* registered as live MathJax macros (see below)
- `bibliography-raw`: literal LaTeX (e.g. a `thebibliography` block), inserted
  after the body. Normally left unset — see "Citations" below, which fills
  this in automatically from whatever sources the note actually cites.
- `autoEqnLabels: true` — number every display equation, not just labelled
  ones

`preamble`, `theorems`, `macros`, and `bibliography-raw` can each be either
the literal value shown above, or `"[[Some Note]]"` — a wikilink to another
note holding that content instead, so a shared preamble/macros/theorem setup
doesn't have to be copy-pasted into every note's frontmatter. For
`preamble`/`macros`/`bibliography-raw` the linked note's body (plain text,
frontmatter stripped if it has any) is used; for `theorems` it's the linked
note's own `theorems:` frontmatter field. See `examples/Util/preamble.md`,
`examples/Util/macros.md`, `examples/Util/theorems.md`, referenced from
`examples/weierstrass.md`.

Several sources compose as a YAML list (what Obsidian's properties editor
writes for a list property), which may also mix in inline values:

```yaml
preamble:
  - "[[preamble]]"
  - \usepackage{tikz-cd}
theorems:
  - "[[theorems]]"
  - "[[problem-theorems]]"
```

Text fields are joined in the order listed; `theorems` lists are
concatenated (a linked theorems note may itself link further notes), and
if two sources declare the same `id` the first one wins. A link that
doesn't resolve is an export error.

#### Default frontmatter

Settings → LaTeX Exporter → **Default frontmatter** names a note (e.g.
`Util/Default frontmatter.md`) whose frontmatter every export falls back
on: any field the exported note doesn't set itself — preamble, theorems,
macros, author, layout — comes from there, its `[[links]]` resolved from the
template note. The title is the exception: it's always the note's own
`title:`, else its file name, never the template's. So a bare scratch note
with no frontmatter at all compiles to a proper PDF. The template is a
normal note, so it can double as an Obsidian template for new notes. See
`examples/Util/Default frontmatter.md` and `examples/Scratch/Quick note.md`.

### Citations

Each bibliography source is its own note — `key` (the `\cite{}` argument)
and `bibitem` (the hardcoded `\bibitem[...]{...}` entry, written exactly as
it should appear in the exported document) in its frontmatter:

```yaml
---
key: kk
bibitem: |
  \bibitem[KK]{kk}
  Koecher, Max, und Aloys Krieg. 2007. Elliptische Funktionen und Modulformen. ...
---
```

(see `examples/Quellen/Koecher-Krieg.md`, `examples/Quellen/Remmert-Schumacher.md`). Citing
one from a note's body is `&[[Koecher-Krieg]]` — an `&` right before a
wikilink to the source note — which `citations.ts` expands to a raw
`` `\cite{kk}`{=latex} `` span. Every distinct source cited this way has its
`bibitem` collected and assembled into `bibliography-raw` automatically (in
citation order), so the exported bibliography always matches exactly what
got cited — no `bibliography-raw` field to maintain by hand.

Body — theorem-like environments are bold statements (or, alternatively,
callouts — see below):

```
**Lemma** (&[[Koecher-Krieg]] S.21f) {#lem-gitter-invariant}
Man nennt
$$
\delta := \delta(\omega_1, \omega_2)
$$

**Beweis**
Betrachte ...
∎

Teilt man die Gleichung durch ... erhält man die Behauptung.
∎
```

This mirrors how theorems are actually typeset in a paper: a bold label
opens the statement, an end-of-proof-style mark (`∎`) closes it.

- `**Word**` only starts a block when `Word` (trailing period stripped,
  case-insensitively) matches a `theorems[].name` or the note's `proofname`
  — so ordinary bold text elsewhere is left alone.
- `(title)` right after the bold word becomes the `\begin{env}[title]`
  argument; `{#label}` becomes `\label{label}`. Both are optional, in that
  order.
- Anything after the header on the same line is treated as the first line
  of the body, exactly like typing it on the next line.
- `∎` on its own line closes the innermost still-open block — blocks nest
  by stacking, so a proof can sit inside a theorem simply by opening one
  bold-statement block before closing the other:
  `**Theorem**... **Beweis**... ∎ (closes proof) ... ∎ (closes theorem)`.
- Cross-references to anything with a `{#label}` — a theorem header or a
  labelled equation — use the shortcut `[#label]` (the **Insert reference to
  label** command inserts these for you, so you never have to remember or
  retype an id). `referenceShortcuts.ts` expands this to a raw
  `` `\ref{label}`{=latex} `` span; amsthm/hyperref resolve it directly at
  LaTeX-compile time, no pandoc filter involved.
- Cross-references to numbered equations can *also* use pandoc-crossref's
  own syntax: `` $$...$$ {#eq:foo} `` to label, `` [@eq:foo] `` to reference
  (renders as `\eqref{}` instead of plain `\ref{}`) — prefer this over
  `[#eq:foo]` when you specifically want the parenthesized `\eqref` style.
- `\begin{align}...\end{align}` needs `$$` around it, same as any other
  display equation — MathJax does *not* auto-detect AMS environments outside
  math delimiters, so a bare `\begin{align}` is just plain text to Obsidian's
  live renderer. `rawEnvironments.ts` strips that `$$` and wraps the
  environment in a raw block for pandoc instead (pandoc's LaTeX writer can't
  emit `align` nested inside `$$...$$` math, so passing it through unchanged
  would come out broken).
- Anything else pandoc's markdown can't express directly (a mid-document
  `\newcommand`, an environment MathJax doesn't understand) goes in an
  explicit raw block: `` ```{=latex} ... ``` ``.

Obsidian callouts work too, as an alternative spelling of the same blocks:

```
> [!lemma] Gitterinvarianz {#lem-gitter-invariant}
> Man nennt ...
> > [!beweis]
> > Betrachte ...
```

The callout type is matched like a bold word (a `theorems[].name` or the
`proofname`) or against a `theorems[].id`, case-insensitively; the title
becomes `\begin{env}[title]`, a trailing `{#label}` becomes `\label{label}`,
and the callout ends where its `>` lines do — no `∎` needed. Nested
callouts (`> >`) nest environments. A callout whose type isn't a declared
environment (`> [!info]`) is exported as an ordinary blockquote with a bold
title. See `examples/problem-sheet.md`.

Math (`$...$`, `$$...$$`) is passed to pandoc as-is — never reinterpreted —
so any macro from `macros:` just works in the exported `.tex`.

### Multi-chapter projects

Everything above is per-note — the right scale for a single paper, but not
for a thesis with a dozen chapters that need to share one bibliography, one
set of theorem counters, and one table of contents. **Export project to
LaTeX**/**PDF** cover that: point a *master* note's `chapters:` frontmatter
at the chapter notes, in order, and they're assembled into one
`\documentclass{report}` document instead of exported one at a time.

```yaml
---
title: Die geometrische Brownsche Bewegung und Anwendungen
author: Fabian Schuller
preamble: "[[preamble]]"
theorems: "[[theorems]]"
chapters:
  - "[[00 Motivation]]"
  - "[[10 Stochastische Prozesse]]"
  - "[[70 Anhang]]"
appendix-from: "[[70 Anhang]]"
---

Optional preface/abstract text, placed before the first chapter.
```

- `chapters` — required, a non-empty list of `[[wikilinks]]` to chapter
  notes, in document order. Each chapter note is a plain note (its own
  `#`-heading becomes `\chapter{...}`, via `--top-level-division=chapter`) —
  nothing distinguishes "a chapter note" from any other note except being
  listed here.
- `appendix-from` — optional; a `[[wikilink]]` to the chapter that starts the
  appendix. A raw `\appendix` is inserted immediately before it, so it and
  every chapter after it are lettered (Appendix A, B, ...) instead of
  numbered — same mechanism `\begin{appendices}` gets you by hand.
- `documentclass` — defaults to `report`; set to `book` for front/main/back
  matter with `\part`s, or anything else your preamble supports.
- `division` — the pandoc top-level-division; defaults to `chapter`.
- `numberwithin` — what `\numberwithin{equation}{...}` numbers equations by;
  defaults to `section` (same as single-note export). A thesis with numbered
  equations per chapter would set this to `chapter`.
- `toc` — defaults to `true` for project export (`false` to omit); single-
  note export leaves it unset, so `\tableofcontents` is opt-in there.
- Everything a single note's frontmatter already supports (`preamble`,
  `macros`, `theorems`, `title`/`author`/`date`, layout knobs, `refname`/
  `proofname`) works identically here, declared once on the master note and
  shared by every chapter.
- Citations (`&[[Source]]`) work across chapters exactly as within one note:
  a source cited from two different chapters gets one `\cite{}` key and one
  bibliography entry, and the assembled bibliography follows first-cited-
  across-the-whole-project order.
- The **Export project to…** commands only appear in the command palette
  when the active note's frontmatter actually has a `chapters:` list — run
  them from the master note, not from an individual chapter.

### Images

Obsidian image embeds export as figures, so images pasted into a note in
Obsidian just work:

| Note | LaTeX |
|---|---|
| `![[plot.png]]` | `\includegraphics{../attachments/plot.png}` |
| `![[plot.png\|300]]` | 300px wide (`300x200` sets the height too) |
| `![[plot.png\|A caption]]` | a figure captioned "A caption" |

The file is found the way Obsidian finds it — by name, anywhere in the
vault — and written as a path relative to the folder LaTeX compiles in (the
note's, or a project's master note's). PNG, JPG and PDF work with every
engine. Standard Markdown images (`![Caption](figures/plot.png)`, relative
to the note) work too. Embeds of other notes (`![[Note]]`) are not
exported.

### TikZ diagrams

For projects with figures — plots, commutative diagrams, decision trees —
a ` ```tikz ``` ` fenced block (the same plain syntax the community
[obsidian-tikzjax](https://github.com/fabsch225/obsidian-tikzjax) plugin
renders live via TikZJax, if it's installed too) is passed through as raw
LaTeX instead of a literal code block:

```tikz
\begin{tikzpicture}
\draw[-Stealth] (0,0) -- (2,1);
\end{tikzpicture}
```
Figure: A TikZ diagram, exported as a numbered figure. {#fig:comm}

A `Figure:` line right after the closing fence — same shape as a
bold-statement header's `(title) {#label}` — promotes the block to a
captioned, labelled `figure` environment, numbered and cross-referenceable
with `[#fig:comm]` like anything else with a `{#label}`. Without a `Figure:`
line, the `\begin{tikzpicture}...\end{tikzpicture}` is emitted unwrapped,
for a diagram meant to sit inline rather than as a numbered float.

Needs `\usepackage{tikz}` (and any `\usetikzlibrary{...}`) in `preamble:` —
not added automatically, since not every project uses TikZ.

## Live macros in Obsidian's math mode

Obsidian's own MathJax renderer has no idea what `\pa` or `\vol` mean — it
only sees them in the exported `.tex`, compiled by real LaTeX. This is
MathJax-only: preview never shells out to the local TeX install (pandoc's
export pipeline is the only thing that does that), so anything MathJax's
own TeX input processor doesn't implement won't render here regardless —
see the `\pa` note below.

To make custom commands render in Obsidian's editor/preview, the plugin
collects `\newcommand`/`\renewcommand` declarations from two places in the
active note:

1. The `macros:` frontmatter field (the note-wide ones).
2. Any ` ```{=latex} ... ``` ` raw block in the body (`latex/inlineMacros.ts`)
   — e.g. a proof-local helper like `\sumoverannuli`, defined mid-proof and
   only used there, never promoted to frontmatter.

Both are concatenated and run through MathJax's own parser once, via
`MathJax.tex2chtml(macroSource)` (`obsidian-math/mathJaxMacros.ts`). MathJax
executes the `\newcommand` declarations it contains as a side effect of that
parse, which registers them in its live macro table — the same technique
the community ["Extended MathJax"](https://github.com/wei2912/obsidian-latex)
plugin uses for its preamble.sty feature.

This is not the same as (and does not work the same as) mutating
`MathJax.tex.macros` directly: that object is only consulted at MathJax's
own startup, so changing it afterwards is a silent no-op — nothing re-reads
it. An earlier version of this plugin did exactly that and macros never
rendered; `tex2chtml` is the part of MathJax's *public* API that actually
feeds its input processor.

This runs on plugin load and whenever the active note or its frontmatter
changes. Caveats:

- Content already on screen when a macro is (re)registered needs a manual
  refresh — switch away from the note and back — to pick it up. New math you
  type after registration renders correctly immediately.
- If you just installed/updated the plugin while a note was already open,
  do one such refresh (or reload Obsidian) once.
- `\pa` (the lattice-parallelogram symbol) is defined using `\rotatebox`,
  which is a `graphicx` package macro — real TeX, but not something MathJax's
  TeX input processor implements (no `graphicx` extension exists for it).
  It renders fine in the exported PDF (real LaTeX), but will show as an
  undefined-command error in Obsidian's preview. Accepted limitation, not a
  bug: this system stays MathJax-only for preview, on purpose, rather than
  shelling out to the local LaTeX install just to render one symbol.

## Regenerating the example / debugging outside Obsidian

The bold-statement preprocessing needs frontmatter's parsed `theorems:` list,
so it isn't a single pandoc command — see `latex-exporter/src/export/exporter.ts`
for the exact sequence: read note -> `resolveFrontmatterReferences`
(inline any `[[wikilink]]`-referenced preamble/macros/bibliography/theorems)
-> `expandCitations` (`&[[Source]]` -> `\cite{key}`, assemble
`bibliography-raw` from what got cited) -> `convertAlignBlocksToRaw` ->
`preprocessTheoremBlocks` -> `expandReferenceShortcuts` -> write temp `.md`
-> pandoc. To debug the pandoc step alone against an already-preprocessed
file (frontmatter references and citations already inlined by hand, if the
note used any):

```sh
pandoc preprocessed.md \
  --from=markdown-latex_macros \
  --template=latex-exporter/pandoc/template.latex \
  --lua-filter=latex-exporter/pandoc/theorems.lua \
  --filter=pandoc-crossref \
  --top-level-division=section \
  -o out.tex
```

Note the `-latex_macros`: pandoc's default markdown reader pre-expands any
`\newcommand` it sees (including ones from `macros:`) inside math, which
defeats the point of defining macros. Disabling that extension keeps macro
calls literal so the emitted `.tex`'s own `\newcommand`s do the expansion, as
intended.

## Known deviations from hand-written LaTeX

- Numbered equations are wrapped by pandoc-crossref as `\begin{equation}{...}`
  (an extra brace group). This is pandoc-crossref's normal output, compiles
  fine, and is left alone rather than patched.
- A bare `\item` list outside any list environment (as in the original
  Weierstraß source's Liouville theorem) is invalid LaTeX; the example fixes
  this by using a real ordered list, which loses the `(1)`/`(2)` label style
  in favour of `1.`/`2.`.
- Theorem/lemma labels use hyphens (`thm-weier`), not colons (`thm:weier`) —
  a holdover from when labels were Obsidian block-references (which don't
  allow colons); kept for consistency even though that's no longer required.

## callout-manager/ (unused, kept for reference)

An earlier version of this system wrote theorem-like blocks as Obsidian
callouts (`> [!theorem] ...`) and `callout-manager/` is a fork of
[eth-p/obsidian-callout-manager](https://github.com/eth-p/obsidian-callout-manager)
pre-seeded with presets for that. Callouts turned out to be unpleasant to
edit (every line needs a `>` prefix, which fights multi-line math and
copy/paste), so the bold-statement syntax above became the primary one;
callouts are still exported the same way, but this plugin is no longer
installed in the vault. The fork is left in this repo in
case it's useful for something else later; delete `callout-manager/` if not.
