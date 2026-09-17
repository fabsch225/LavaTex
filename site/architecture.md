# Architecture

LavaTex is split into two independent concerns that don't know about each
other: turning a note into a `.tex` file (**export**), and making custom
math commands render live while you write (**preview**). A third, smaller
piece collects labels for the reference-picker command. All of the actual
"understand LaTeX" work is delegated to `pandoc`, `pandoc-crossref`, and a
small Lua filter — LavaTex's own code is pure text transforms plus some
Obsidian glue.

## Source layout

```
latex-exporter/src/
  latex/                        pure functions, no Obsidian API
    theoremEnvironments.ts        frontmatter -> {trigger word: env id}
    theoremBlockPreprocessor.ts   bold-statement block -> pandoc fenced div
    rawEnvironments.ts            $$\begin{align}...\end{align}$$ -> {=latex} raw block
    referenceShortcuts.ts         [#label] -> raw \ref{label} span
    inlineMacros.ts                \newcommand in body {=latex} blocks -> text
    labelCollector.ts             note text -> every {#label} + context
  obsidian-math/
    mathJaxMacros.ts             feed macro text to Obsidian's live MathJax renderer
  export/
    paths.ts                     vault/plugin filesystem paths
    pathEnv.ts                   PATH augmentation shared by pandoc.ts/latex.ts
    frontmatterRefs.ts           resolve [[wikilink]] frontmatter fields to referenced notes
    citations.ts                 &[[Source]] -> raw \cite{key} span + assembled bibliography-raw
    pandoc.ts                    spawn pandoc: LaTeX (template+theorems.lua) or plain markdown
    latex.ts                     spawn latexmk to compile PDF, open it
    exporter.ts                  orchestrates the preprocessing passes + pandoc(+pdf/md)
  ui/
    ReferenceSuggestModal.ts     fuzzy picker for the reference-insertion commands
    PromptModal.ts               single-line text prompt (raw LaTeX, equation/theorem labels)
  main.ts                        wires commands + events to the pieces above
```

Everything in `latex/` is text-in/data-out with no side effects, which is
what makes each transform independently testable and lets `exporter.ts` stay
a short, readable pipeline instead of a place where unrelated concerns pile
up.

## Export: note → `.tex`

```mermaid
flowchart LR
    Note["note.md\n(bold statements, macros:,\n$$\begin{align}...\end{align}$$, [#label])"]
    Note --> FmRefs["resolveFrontmatterReferences\n([[wikilink]] preamble/macros/\nbibliography/theorems -> inlined)"]
    FmRefs --> Cite["expandCitations\n(&[[Source]] -> \cite{key},\nbibitem: -> assembled bibliography-raw)"]
    Cite --> Align["convertAlignBlocksToRaw"]
    Align --> Blocks["preprocessTheoremBlocks\n(frontmatter theorems: -> env ids)"]
    Blocks --> Refs["expandReferenceShortcuts"]
    Refs --> Tmp[("temp .md")]

    Tmp --> Pandoc(["pandoc"])
    Template["pandoc/template.latex"] --> Pandoc
    Lua["pandoc/theorems.lua\n(Lua filter)"] --> Pandoc
    Crossref["pandoc-crossref\n(external filter)"] --> Pandoc

    Pandoc --> Tex["note.tex"]
    Tex -.->|pdflatex / xelatex, by hand| PDF[("PDF")]
```

Each preprocessing step targets disjoint syntax (align blocks, bold headers,
reference shortcuts), so their order mostly doesn't matter — they're run in
this sequence in `exporter.ts` for no reason deeper than readability.

`theorems.lua` is the one piece doing real LaTeX-environment work
(`::: {.lemma title="..." #id}` → `\begin{lemma}[...]\label{id}`);
`theoremBlockPreprocessor.ts`'s only job is producing the fenced-div syntax
that filter understands. Two small single-purpose transforms instead of one
that does both jobs.

Pandoc never reparses a fenced div's attribute values as markdown — they're
plain strings — so a title containing a raw-inline span (like a citation's
`` `\cite{key}`{=latex} ``) would otherwise land in the `.tex` literally,
backticks and all. `theorems.lua` round-trips the title string through
`pandoc.read`/`pandoc.write` before splicing it into `\begin{env}[title]`,
so it's rendered exactly like ordinary body text would be.

Numbered, cross-referenceable equations (`$$...$$ {#eq:foo}`, `[@eq:foo]`)
are handled entirely by `pandoc-crossref` — a well-maintained, purpose-built
tool for exactly that, not reimplemented here.

### Export: note → plain markdown

"Export plain Markdown" runs the exact same preprocessing (through
`expandReferenceShortcuts`), then hands the result to `runPandocToMarkdown`
instead of `runPandoc`: no `--template`, no `--lua-filter`. Skipping
`theorems.lua` is deliberate — that filter's whole job is turning a fenced
div into a raw `\begin{env}...\end{env}` LaTeX block, which is exactly the
kind of thing a *plain*-markdown export shouldn't produce. Left as a fenced
div (`::: {.theorem title="..."} ... :::`), pandoc's markdown writer
round-trips it natively, so the structure survives without any LaTeX
toolchain to render it.

`--filter pandoc-crossref` stays on, since it numbers and cross-references
equations for any output format, not just LaTeX — so `[@eq:foo]` still
becomes real, readable text (`eq. 3`), not raw markup. `\ref{}`/`\cite{}`
(from `expandReferenceShortcuts`/`citations.ts`) have no such luck: they
only resolve at LaTeX-compile time, so they pass through as the raw
`` `\ref{...}`{=latex} ``/`` `\cite{...}`{=latex} `` spans pandoc's markdown
writer already emits for anything it doesn't understand — an honest gap,
not a bug, since there's no LaTeX compiler in this path to resolve them
against.

## Live preview: math macros in Obsidian's own editor

Obsidian's MathJax renderer has no idea what a note's custom `\newcommand`s
mean — normally it only ever sees them inside the exported `.tex`, compiled
by real LaTeX. LavaTex mirrors macro definitions into MathJax's own live
macro table so they render immediately in edit/preview mode too:

```mermaid
flowchart LR
    FM["frontmatter\nmacros: field"]
    Body["body {=latex} blocks\n(a note-local helper macro,\ne.g. proof-only)"]

    FM --> Extract1["(read directly)"]
    Body --> Extract2["extractInlineMacros"]

    Extract1 --> Combine["concatenate"]
    Extract2 --> Combine

    Combine --> Register["registerMathMacros"]
    Register --> Tex2chtml["MathJax.tex2chtml(macroSource)"]
    Tex2chtml --> Live["Live rendering in\nObsidian edit/preview"]
```

This runs on plugin load and whenever the active note or its frontmatter
changes (`main.ts` listens to `workspace.on("active-leaf-change")` and
`metadataCache.on("changed")`).

The registration technique matters and was the result of an actual bug:
mutating `MathJax.tex.macros` directly is a dead end — that object is only
consulted once, at MathJax's own startup, so changing it afterwards is a
silent no-op. Running the macro text through MathJax's own parser via
`tex2chtml` is what actually works, because `\newcommand` execution is a
real side effect of that parse. This is the same technique the community
[Extended MathJax](https://github.com/wei2912/obsidian-latex) plugin uses
for its preamble.sty feature.

Not every macro can render this way: `\pa` in the worked example uses
`\rotatebox` (a `graphicx` package macro), which MathJax's TeX engine simply
doesn't implement — no such extension exists for MathJax. It renders
correctly in the exported PDF (real LaTeX) but shows as an undefined-command
error in Obsidian's preview. Accepted, on purpose: LavaTex's preview stays
MathJax-only rather than shelling out to a local LaTeX install to render one
symbol.

## Inserting a reference

```mermaid
sequenceDiagram
    participant U as User
    participant Cmd as "Insert reference to label" command
    participant LC as labelCollector
    participant Modal as ReferenceSuggestModal
    participant Ed as Editor

    U->>Cmd: run command
    Cmd->>LC: collectLabels(noteText)
    LC-->>Cmd: LabelEntry[] (label + context)
    Cmd->>Modal: open(entries)
    U->>Modal: fuzzy search, select
    Modal->>Ed: replaceSelection("[#label]")
```

`collectLabels` scans for every `{#label}` attribute in the note — a
bold-statement theorem header and a labelled `$$...$$ {#eq:foo}` equation
use the identical syntax, so one scan finds both kinds, and the picker
doesn't need to know which is which.

"Reference equation" is the same flow, filtered to `label.startsWith("eq:")`
and with `ReferenceSuggestModal`'s `format` callback swapped to
`` `[@${label}]` `` instead of the default `` `[#${label}]` `` — pandoc-
crossref's syntax, which renders as `\eqref{}` instead of plain `\ref{}`.

"Add equation label" and "Add theorem label" don't need any of this —
they're a `PromptModal` (a single-line text prompt, also backing "Insert
raw LaTeX") that inserts `{#eq:name}` / `{#name}` directly at the cursor.
