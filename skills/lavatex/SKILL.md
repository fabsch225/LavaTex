---
name: lavatex
description: Write and edit mathematical documents as Obsidian notes in LavaTex syntax — the Markdown superset the LavaTex "LaTeX Exporter" plugin turns into production LaTeX/PDF (theorem blocks opened by a bold word and closed by ∎, {#labels} with [#label]/[@eq:x] references, &[[Source]] citations, YAML-frontmatter preamble/macros/theorems, tikz blocks, multi-chapter projects). Use whenever the user asks to write, draft, transcribe, convert (e.g. from LaTeX or a PDF), extend or fix a note, paper, seminar paper, lecture notes or thesis chapter in a LavaTex/Obsidian vault — or when a vault's notes already use **Theorem** … ∎ blocks or &[[...]] citations.
---

# Writing documents in LavaTex

LavaTex notes are ordinary Obsidian notes that read well in the editor
(MathJax renders math, TikZJax renders diagrams) **and** export to a clean
`.tex`/PDF via pandoc + pandoc-crossref. The syntax is opinionated and
small, so stick to exactly what's below. Anything else ends up as literal
text in the PDF or breaks compilation.

The full worked example is in [reference/example-note.md](reference/example-note.md).
Read it before writing your first note.

## Workflow

1. **Learn the vault's conventions first.** Before writing anything, look for:
   - shared setup notes referenced by other notes' frontmatter, such as
     `preamble: "[[preamble]]"`, `theorems: "[[theorems]]"` and
     `macros: "[[macros]]"` (often in a `Util/` folder). Reuse them rather
     than inventing a new preamble.
   - the folder holding source notes (notes whose frontmatter has `key:` and
     `bibitem:`, e.g. `Quellen/` or `Sources/`). Cite those; add new ones there.
   - the document language. Theorem names (`Satz`, `Beweis`…), `proofname`
     and `refname` follow it.
2. **Write the note** following the rules below.
3. **Validate** with the bundled checker (see [Validating](#validating)), fix
   what it reports, and repeat until it compiles with no `!` warnings.
4. Tell the user which Obsidian command to run: *Export current note to PDF*,
   or *Export project to PDF* from a master note.

## Frontmatter

```yaml
---
title: The Snake Lemma          # \title; may contain $math$; use "|" + "\\" for line breaks
author: Jane Doe
date: \today                    # literal LaTeX is fine
fontsize: 12pt                  # optional layout knobs: fontsize, margin, linestretch
margin: 1in
proofname: Proof                # the word that opens a proof block, and \proofname
refname: References             # bibliography heading (e.g. Referenzen, Quellenverzeichnis)
preamble: "[[preamble]]"        # or literal LaTeX via "|" — see below
theorems: "[[theorems]]"        # or an inline list — see below
macros: "[[macros]]"            # or literal \newcommand lines
autoEqnLabels: true             # optional: number every display equation
toc: true                       # optional on single notes
---
```

- `preamble`, `theorems`, `macros` and `bibliography-raw` each take either a
  literal value or a `"[[Wikilink]]"` (quoted) to a note holding it — or
  several as a YAML list of quoted links, joined in
  order (first declaration of a theorem `id` wins).
- **The preamble must load `amsmath` (or `mathtools`) and `amsthm`.** The
  template always calls `\numberwithin{equation}{section}` and uses amsthm
  environments. Add `tikz` (+ `\usetikzlibrary`) for diagrams, `listings`
  for code, `hyperref` for clickable references, `babel` for non-English text.
- Leave `bibliography-raw` unset; citations fill it automatically.

### `theorems`

```yaml
theorems:
  - {id: theorem, name: Theorem, counter: section}   # own counter, numbered within sections
  - {id: lemma, name: Lemma, like: theorem}           # shares theorem's counter
  - {id: definition, name: Definition, like: theorem}
  - {id: deflemma, name: "Definition und Lemma", like: theorem}
```

`id` is the LaTeX environment name; `name` is the exact word(s) you **bold**
in the body to open one. `proof` always exists and is opened by `proofname`.

## Theorem-like blocks (the core rule)

```markdown
**Theorem** (Snake Lemma; &[[Weibel]] p. 11) {#thm-snake}
Statement, with math:
$$
0 \to \ker\alpha \to \ker\beta \to \ker\gamma
$$

**Proof**
Argument …
∎
∎
```

- Open with `**Name**` at the start of a line, where `Name` is a `theorems[].name`
  or the `proofname`. Optionally follow it with `(title)`, then `{#label}`, on
  the same line.
- **Close every block with `∎` on its own line.** This includes definitions,
  remarks and statements without a proof. Each `∎` closes the innermost open
  block. A proof inside a theorem therefore needs **two** `∎`: the first
  closes the proof, the second closes the theorem. Above, the proof sits
  *inside* the theorem. If you want the proof after the theorem instead,
  close the theorem first:

  ```markdown
  **Lemma** {#lem-key}
  Statement.
  ∎

  **Proof**
  Argument.
  ∎
  ```
- Bold text that isn't a declared name stays ordinary bold, so `**note**`
  in prose is fine. Conversely, a misspelled or undeclared name silently
  fails to open a block.
- Obsidian callouts (`> [!lemma] Title {#lem-key}`, type = declared name
  or id, no `∎`) export the same way — keep them when the user's note
  already uses them, but write new blocks as bold statements. Never use raw
  `\begin{theorem}` for theorem-like blocks.

## Labels and references

| What | Label | Reference |
|---|---|---|
| theorem-like block | `{#thm-foo}` in its header (**hyphens, not colons**) | `[#thm-foo]` → `\ref` |
| display equation | `{#eq:foo}` right after the closing `$$` (same or next line) | `[@eq:foo]` → "eq. 1.3" (pandoc-crossref adds the prefix), or `[#eq:foo]` → bare "1.3" |
| TikZ figure | `{#fig:foo}` at the end of its `Figure:` line | `[#fig:foo]` |
| section | automatic: `# Setup and statement` → id `setup-and-statement` | `[#setup-and-statement]` |

Write "see Lemma [#lem-key]" yourself. References insert only the number.
Never write `\label`/`\ref`/`\eqref` by hand.

## Citations

Cite with `&[[Source Note]]`, for example `(&[[Koecher-Krieg]] S. 35)`, or
inside a theorem title. Each source is its own note:

```yaml
---
key: kk2007
bibitem: |-
  \bibitem[KK07]{kk2007}
  Koecher, Max, and Aloys Krieg. 2007. Elliptische Funktionen und Modulformen. Springer.
---
```

Only cited sources appear in the bibliography, in citation order. When a
source note doesn't exist yet, create it in the vault's sources folder. Use a
unique `key`, and give the `bibitem` exactly the formatting it should have in
the PDF (`\url{}` for links). Ordinary `[[links]]` without `&` are fine anywhere:
they export as plain text.

## Math

- `$…$` inline and `$$…$$` display. Math passes through to LaTeX untouched,
  so any LaTeX math and any macro defined in `macros:` works.
- Multi-line environments go **inside** `$$`:
  ```markdown
  $$
  \begin{align}
  a &= b \\
  &= c
  \end{align}
  $$
  ```
  A bare `\begin{align}` outside `$$` is plain text to Obsidian.
- Put new `\newcommand`s in the `macros:` note or field, so they render live
  in Obsidian too. Don't redefine commands that LaTeX already has.
- Numbering: equations are numbered only if labelled (`{#eq:…}`), unless
  `autoEqnLabels: true` is set.

## Raw LaTeX (escape hatch, use sparingly)

- Inline: `` `\ohnebew`{=latex} ``, `` `\newpage`{=latex} ``
- Block:
  ````markdown
  ```{=latex}
  \begin{center} … \end{center}
  ```
  ````
Use it only for what Markdown can't express (`\appendix`, `\newpage`,
one-off environments). A `\newcommand` in a raw block also renders live.

## Figures, code and images

- **TikZ:** a ` ```tikz ` fence. A line directly after the closing fence,
  `Figure: Caption text. {#fig:name}`, makes it a numbered figure. You may
  wrap the picture in `\begin{document}…\end{document}` with
  `\usetikzlibrary{…}` lines first, which TikZJax needs for live preview; the
  exporter strips that wrapper. The preamble needs `\usepackage{tikz}` and
  the same libraries.
- **Code:** a fence with a language tag (` ```python `) becomes `lstlisting`.
  The preamble needs `listings`; set the language/style once with `\lstset`.
- **Images:** standard Markdown with a path relative to the note,
  `![Caption](figures/plot.png)`. Obsidian `![[embeds]]` are **not** exported.
- **Lists/tables:** normal Markdown lists and pipe tables work. Don't write
  bare `\item`.

## Multi-chapter projects (theses, lecture notes)

One master note holds the shared frontmatter plus an ordered `chapters:`
list. Each chapter is a normal note whose top `#` heading becomes
`\chapter`:

```yaml
---
title: …
preamble: "[[preamble]]"
theorems: "[[theorems]]"
chapters:
  - "[[00 Introduction]]"
  - "[[10 Background]]"
  - "[[70 Appendix]]"
appendix-from: "[[70 Appendix]]"   # \appendix before this chapter
numberwithin: chapter              # optional: equations numbered per chapter
documentclass: report              # default; or book
---
Optional abstract/preface text (placed before chapter 1).
```

Chapter notes need no frontmatter of their own. Labels and `&[[citations]]`
work across chapters. Run *Export project to PDF* from the master note.

## Validating

```sh
node <skill-dir>/scripts/check_note.mjs <vault-dir> <note-path-relative-to-vault> [--engine latexmk|tectonic] [--no-compile]
```

It runs the real LavaTex pipeline (lavatex-core → pandoc + pandoc-crossref
→ latexmk or Tectonic), writes `<note>.tex`/`.pdf` next to the note like
the plugin does, and reports:

- `✗ Export failed`: a frontmatter or link problem (bad YAML, an unresolved
  `[[link]]` in `preamble`/`theorems`/`chapters`).
- `✗ LaTeX compilation failed`: the first TeX error and its line in the
  `.tex`. Open the `.tex` near that line to map it back to the note.
- `! references to labels not defined`: a typo in `[#…]`/`[@…]` or a missing `{#…}`.
- `! bold text that did not become an environment`: a misspelled block name
  or one missing from `theorems:`.
- `! a ∎ survived into the .tex`: a stray `∎` (or its block header wasn't
  recognised).
- `! undefined after compiling`: a reference or citation LaTeX couldn't resolve.

It needs `pandoc` and `pandoc-crossref` on PATH, plus `latexmk` or `tectonic`.
If none of those are available, use `--no-compile` or skip validation and
carefully re-check the rules above. It finds `lavatex-core` via
`$LAVATEX_CORE` (a built LavaTex checkout), `require("lavatex-core")`, or
the LavaTex repo this skill lives in.

## Checklist before finishing

- [ ] Preamble (inline or linked) loads amsmath/mathtools + amsthm, plus tikz/listings/babel/hyperref as used
- [ ] Every bold block name is declared in `theorems:` (or is `proofname`)
- [ ] Every block closed by its own `∎`; nested proofs → two `∎`
- [ ] Theorem labels use hyphens; equation labels `eq:`, figure labels `fig:`
- [ ] Every `[#…]`/`[@…]` has a matching `{#…}`
- [ ] Citations are `&[[Source]]` to notes that have `key` + `bibitem`
- [ ] Callout types (if any) are declared environments; no hand-written `\label`/`\ref`/`\cite`, no `![[embeds]]`
- [ ] Checker passes, or you said why it couldn't run
