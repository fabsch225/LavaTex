# Markdown spec

This is the exact markdown superset LavaTex reads. It's deliberately
opinionated — some things are fixed and not configurable — and everything
that *is* configurable lives in one place: the note's YAML frontmatter.

## Preamble

Equations are always numbered per section
(`\numberwithin{equation}{section}`); everything else about the preamble —
the package list included — comes from the note's `preamble` frontmatter
field, not a hardcoded list in `template.latex`.

`examples/preamble.md` is a suggested opinionated default (`mathtools`,
`amssymb`, `amsthm`, `mathrsfs`, `bbm`, `bm`, `hyperref` with colored blue
links, `setspace`, `enumitem`), referenced from `examples/weierstrass.md`'s
frontmatter — reuse it, or write your own if a project needs a different
package set.

## Frontmatter fields

| Field | Meaning |
|---|---|
| `title`, `author`, `date` | Passed straight to `\title`/`\author`/`\date` |
| `fontsize`, `margin`, `linestretch` | Document-wide layout knobs |
| `refname` | Renames `\refname` (e.g. `Referenzen` for a German bibliography heading) |
| `proofname` | Renames `\proofname`, **and** is the word you bold to start a proof block (see below) |
| `preamble` | Literal LaTeX (`\usepackage...`), inserted right after `\documentclass`/`geometry`/`inputenc` |
| `theorems` | List of environments — see below |
| `macros` | Literal `\newcommand`/`\renewcommand` text |
| `bibliography-raw` | Literal LaTeX (e.g. a `thebibliography` block), inserted after the body. Normally left unset — see "Citations" below, which fills it in automatically |
| `autoEqnLabels: true` | Number every display equation, not just ones with an explicit `{#eq:...}` |

`preamble`, `theorems`, `macros`, and `bibliography-raw` each also accept
`"[[Some Note]]"` — a wikilink to another note holding that content, instead
of the literal value — so a shared preamble/macro/bibliography/theorem setup
doesn't have to be copy-pasted into every note. For `preamble`/`macros`/
`bibliography-raw` the linked note's body is used (frontmatter stripped, if
it has any); for `theorems` it's the linked note's own `theorems:`
frontmatter field, so that file's shape is identical to writing the list
inline, just in its own note.

### `theorems`

A list of environments to declare, each either:

```yaml
theorems:
  - {id: theorem, name: Theorem, counter: section}   # gets its own counter, numbered within section
  - {id: lemma, name: Lemma, like: theorem}           # shares the "theorem" counter
```

- `id` becomes the LaTeX environment name (`\newtheorem{id}...`, and what
  `theorems.lua` matches on).
- `name` is the word you **bold** in the note body to start one — see
  "Theorem-like blocks" below. It does not have to match `id`; you write
  `**Theorem**` even though the environment is internally `theorem`, and
  `**Definition und Lemma**` for an id like `deflemma`.
- `proof` is always available as an environment without being listed here —
  its trigger word is whatever `proofname` is set to (or "Proof" if unset).

### Citations

Each bibliography source is its own note, with `key` (the `\cite{}`
argument) and `bibitem` (the hardcoded `\bibitem[...]{...}` entry, written
exactly as it should appear in the exported document) in its frontmatter:

```yaml
---
key: kk
bibitem: |
  \bibitem[KK]{kk}
  Koecher, Max, und Aloys Krieg. 2007. Elliptische Funktionen und Modulformen. ...
---
```

Citing one from a note's body is `&[[Koecher-Krieg]]` — an `&` right before
a wikilink to the source note — expanded to a raw `` `\cite{kk}`{=latex} ``
span. Every distinct source cited this way has its `bibitem` collected and
assembled into `bibliography-raw` automatically, in citation order, so the
exported bibliography always matches exactly what got cited.

## Theorem-like blocks

Written as a bold label, not a fenced div or an Obsidian callout — both of
those require a `>` prefix on every line, which fights multi-line math and
copy/paste. This instead mirrors how a paper actually typesets a theorem: a
bold label opens the statement, an end-of-proof-style mark closes it.

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

Rules:

- `**Word**` only starts a block when `Word` — trailing period stripped,
  matched case-insensitively — is a `theorems[].name` or the note's
  `proofname`. Bold text that doesn't match anything is left alone; you can
  still write **normal bold text** anywhere else.
- `(title)` right after the bold word, if present, becomes the
  `\begin{env}[title]` optional argument.
- `{#label}` right after that (or right after the bold word, if there's no
  title), if present, becomes `\label{label}`. Use hyphens, not colons
  (`lem-foo`, not `lem:foo`) — see "Known deviations".
- Anything left on the same line after the header is the first line of the
  body — equivalent to just starting the body on the next line instead.
- `∎` on its own line closes the innermost still-open block. Blocks nest by
  stacking: opening a `**Beweis**` block inside an open `**Theorem**` block
  and closing it with its own `∎` before the theorem's `∎` produces a nested
  `\begin{proof}...\end{proof}` inside `\begin{theorem}...\end{theorem}`.
  There's no visual indentation for nesting — the `∎`s alone determine
  structure.
- The command **"Insert environment end mark (∎)"** inserts the character if
  you don't want to type/paste it — worth a hotkey.

## Cross-references

Two independent mechanisms, because they resolve at different times:

- **Anything with a `{#label}`** — a theorem header or a labelled equation
  — is referenced with `[#label]`. This expands to a raw
  `` `\ref{label}`{=latex} `` span; `\ref` resolves it at LaTeX-compile time
  via amsthm/hyperref, no pandoc filter involved. The **"Insert reference to
  label"** command opens a fuzzy picker over every `{#label}` in the current
  note so you never have to remember or retype an id.
- **Numbered equations specifically** can also use pandoc-crossref's own
  syntax: label with `` $$...$$ {#eq:foo} ``, reference with `` [@eq:foo] ``.
  This renders as `\eqref{}` (parenthesized) rather than plain `\ref{}` —
  prefer it when you want that style. `[#eq:foo]` also works (plain `\ref`)
  if you don't.

## Math and raw LaTeX

- `$...$` and `$$...$$` are passed to pandoc, and from there into the `.tex`,
  completely unmodified — never reinterpreted. Any macro from `macros:`
  just works in the exported document.
- `\begin{align}...\end{align}` (and `align*`) needs `$$` around it, same as
  any other display equation — MathJax does not auto-detect AMS environments
  outside math delimiters, so a bare `\begin{align}` is just plain text to
  Obsidian's live renderer. The exporter strips that `$$` and wraps the
  environment in a raw LaTeX block for pandoc instead (pandoc's LaTeX writer
  can't emit `align` nested inside `$$...$$` math, so passing it through
  unchanged would come out broken).
- Anything else pandoc's markdown can't express directly — a mid-document
  `\newcommand` local to one proof, an environment MathJax doesn't support —
  goes in an explicit raw block:
  ````
  ```{=latex}
  \newcommand{\sumoverannuli}{...}
  ```
  ````
  A `\newcommand` written this way is *also* picked up for live MathJax
  rendering (see the Architecture page) — it isn't limited to the
  frontmatter `macros:` field.

## Known deviations from hand-written LaTeX

- Numbered equations are wrapped by pandoc-crossref as `\begin{equation}{...}`
  — an extra brace group. This is pandoc-crossref's normal output, compiles
  fine, and is left alone rather than patched.
- A bare `\item` list outside any list environment (as in the worked
  example's original Liouville theorem) is invalid LaTeX. Use a real ordered
  list instead; you'll get `1.`/`2.` numbering rather than `(1)`/`(2)`.
- Theorem/lemma labels use hyphens (`thm-weier`), not colons (`thm:weier`) —
  a holdover from when labels were briefly Obsidian block-references (which
  don't allow colons); kept for consistency even though nothing enforces it
  anymore.
