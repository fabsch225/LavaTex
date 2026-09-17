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

## Install

1. `cd latex-exporter && npm install && npm run build`
2. Copy `latex-exporter/` (manifest.json, main.js, pandoc/) into
   `<vault>/.obsidian/plugins/`, then enable it in Obsidian's community
   plugins list.
3. Requires `pandoc` and `pandoc-crossref` on `PATH`
   (`brew install pandoc pandoc-crossref`).
4. "Export current note to PDF" additionally requires a LaTeX distribution
   with `latexmk` on `PATH` (e.g. `brew install --cask mactex-no-gui`, or
   any TeX Live/MiKTeX install).

## Usage

Six commands, all in the command palette:

- **Export current note to LaTeX** — writes `<note>.tex` next to the note.
- **Export current note to PDF** — does the above, then runs `latexmk` on
  the result and opens the compiled `<note>.pdf` in your OS's default
  viewer.
- **Insert reference to label** — fuzzy-searches every `{#label}` in the
  current note (theorem headers and labelled equations alike) and inserts
  a `[#label]` shortcut at the cursor.
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
    referenceShortcuts.ts       [#label] -> raw \ref{label} span         (pure)
    inlineMacros.ts             \newcommand in body {=latex} blocks -> text (pure)
    labelCollector.ts           note text -> every {#label} + context    (pure)
  obsidian-math/
    mathJaxMacros.ts           feed macros: text to Obsidian's live MathJax renderer
  export/
    paths.ts                   vault/plugin filesystem paths
    pathEnv.ts                 PATH augmentation shared by pandoc.ts/latex.ts
    pandoc.ts                  spawn pandoc with the fixed flag set
    latex.ts                   spawn latexmk to compile PDF, open it
    exporter.ts                orchestrates the preprocessing passes + pandoc(+pdf)
  ui/
    ReferenceSuggestModal.ts   fuzzy picker for the "insert reference" command
  main.ts                      wires commands + events to the pieces above
```

`latex/*` is pure text-in/data-out — no Obsidian API calls, easy to test
standalone. `obsidian-math/`, `export/`, and `ui/` are the places that talk
to the outside world (the live editor, the pandoc subprocess, and modal UI,
respectively), and none of them know about each other.

The `pandoc/theorems.lua` Lua filter (fenced-div -> `\begin{env}`) does all
the LaTeX-environment work and hasn't changed; `theoremBlockPreprocessor.ts`
only normalizes the note's markdown into the fenced-div syntax that filter
already understands. Two small, single-purpose transforms instead of one
that does both jobs.

## Markdown spec

Fixed preamble (always the same packages/spacing — this is what makes it
opinionated): `mathtools`, `amssymb`, `amsthm`, `mathrsfs`, `bbm`, `bm`,
`hyperref` (blue links), `setspace`, `enumitem`; equations numbered per
section.

Per-document YAML frontmatter:

- `title`, `author`, `date`, `fontsize`, `margin`, `linestretch`
- `refname`, `proofname` — German by default in examples, override per note.
  `proofname`'s value also doubles as the word you bold to start a proof
  (see below).
- `theorems`: list of `{id, name, counter}` (new counter) or `{id, name, like}`
  (shares a counter). `id` becomes the `\newtheorem`/environment name;
  `name` is the word you bold in the note to start one.
- `macros`: literal LaTeX (`\newcommand...`), inserted verbatim into the
  preamble *and* registered as live MathJax macros (see below)
- `bibliography-raw`: literal LaTeX (e.g. a `thebibliography` block), inserted
  after the body
- `autoEqnLabels: true` — number every display equation, not just labelled
  ones

Body — theorem-like environments are bold statements, not fenced divs or
callouts (both were painful to edit — every line needed a `>` prefix):

```
**Lemma** (\kk S.21f) {#lem-gitter-invariant}
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

Math (`$...$`, `$$...$$`) is passed to pandoc as-is — never reinterpreted —
so any macro from `macros:` just works in the exported `.tex`.

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

The bold-statement preprocessing needs frontmatter's parsed `theorems:` list
(normally supplied by Obsidian's metadata cache), so it isn't a single
pandoc command — see `latex-exporter/src/export/exporter.ts` for the exact
sequence: read note -> `convertAlignBlocksToRaw` -> `preprocessTheoremBlocks`
-> `expandReferenceShortcuts` -> write temp `.md` ->
pandoc. To debug the pandoc step alone against an already-preprocessed file:

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
copy/paste), so the bold-statement syntax above replaced them, and this
plugin is no longer installed in the vault. The fork is left in this repo in
case it's useful for something else later; delete `callout-manager/` if not.
