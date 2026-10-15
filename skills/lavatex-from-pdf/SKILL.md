---
name: lavatex-from-pdf
description: Convert a PDF (exercise sheet, lecture notes, paper, handout) into a LavaTex Obsidian note that renders in Obsidian and re-exports to a PDF matching the original. It covers reading the math off rendered pages, porting images as vault attachments, rebuilding commutative diagrams as tikz blocks, and testing both the exported PDF and the live Obsidian rendering. Use when the user gives a PDF path and asks to convert, transcribe, port, import or "make a note from" it in a LavaTex vault.
---

# PDF → LavaTex note

> **Never write solutions.** Convert only what the PDF contains: problem
> statements, definitions, hints, given data. Don't add proofs, answers,
> solution sketches, hints of your own, "Solution:" placeholders with
> content, or worked steps, not even partial ones, and not even when an
> exercise looks trivial. Don't do it when asked to "fill in", "complete"
> or "tidy up" a sheet as part of a conversion either. The sheet is the
> user's homework; working it out is theirs to do. If the user explicitly
> asks for solutions in a separate request, that's a different task. This
> skill never produces them.

This skill is the **procedure** for turning a PDF into a note. The note
**syntax** is the `lavatex` skill: load it too, and follow its rules for
frontmatter, `**Name**` … `∎` blocks, labels, citations and tikz. A
complete worked run, including the mistakes it caught, is in
[reference/conversion-log-alg-geo-sheet-1.md](reference/conversion-log-alg-geo-sheet-1.md).

The goal is a note that **(a)** reads naturally in Obsidian, **(b)**
exports to a PDF that matches the original in content, numbering and
typography, and **(c)** has been checked for both.

## 1. Inspect the PDF

```sh
sh <skill-dir>/scripts/inspect_pdf.sh <file.pdf> <scratch-dir>
```

This prints metadata, the extracted text and the embedded images. It also
renders every page to `page-N.png` and extracts raster images to `img-NNN.png`.

- **Read the page PNGs.** Treat `pdftotext` output as a rough draft of the
  prose only. It mangles math: sub/superscripts, `≅` split into `∼ =`,
  arrow labels and limit indices on separate lines, script vs calligraphic
  letters indistinguishable.
- Note for the whole document:
  - numbering scheme (1, 2, 3 vs 1.1, 1.2),
  - theorem body style (italic = amsthm `plain`, upright = `definition`),
  - math alphabets (`\mathscr` vs `\mathcal` vs `\mathfrak`, bold),
  - operators (`\varprojlim`, `\operatorname{Hom}`),
  - header/title block, and images and diagrams.
- `Creator: LaTeX …` means the original was LaTeX. Ask whether the user has
  the `.tex` source, which beats any transcription.

## 2. Learn the vault

Do what the `lavatex` skill's Workflow says. Also read
`<vault>/.obsidian/plugins/latex-exporter/data.json`: if
`defaultFrontmatterNote` is set, that note's fields apply to every
export. Then the new note only needs what differs (title, date, its own
environments). Watch for:

- Fields merge **key by key**. A note's own `theorems:` or `preamble:`
  replaces the default's value. To extend it, use a list that relinks the
  default's sources and adds to them:
  ```yaml
  preamble:
    - "[[preamble]]"
    - \theoremstyle{definition}     # upright bodies, as most sheets have
  theorems:
    - "[[theorems]]"
    - "[[problem-theorems]]"
    - {id: exercise, name: Exercise}  # neither counter nor like → plain 1, 2, 3
  ```
- The `task` environment (for `[!task]` callouts, below) usually comes from
  a `problem-theorems` note linked in the default frontmatter. If the
  vault has none, declare `{id: task, name: Task, like: theorem}`.
- Check that the shared preamble loads what the math needs (`mathrsfs` for
  `\mathscr`, `tikz`/`tikz-cd`, `amssymb` …). Add packages via the list
  above rather than editing shared notes, unless the user wants that.

## 3. Transcribe

- **Exercise sheets:** each exercise gets its own **h1 heading**, named as
  in the PDF (`# Exercise 1`, `# Aufgabe 2`). Its statement goes
  **verbatim** in a `[!task] Problem Statement` callout:
  ```markdown
  # Exercise 1

  > [!task] Problem Statement
  > Show that the isomorphism
  > $$
  > \Phi_{X,F} : \operatorname{Hom}_{\mathscr C^\wedge}(h_X, F) \cong F(X)
  > $$
  > in the Yoneda lemma is functorial in $X$ and $F$.
  ```
  Every line of the callout, display math included, starts with `> `.
  Sub-parts a), b), c) stay inside the callout as a list. The space below
  each callout is where the user writes their own solution. **Leave it
  empty** (see the rule at the top). The callout exports as
  "Task 1.1 (Problem Statement)" under section "1 Exercise 1". This
  callout form overrides the `lavatex` skill's "prefer bold statements"
  advice for sheets, because it's the convention this user's sheets follow.
- **No `{#label}`s.** Don't put `{#…}` on callouts, headings or blocks
  (`> [!task] Problem Statement {#ex-yoneda-functorial}` is wrong). The
  user doesn't want them: they clutter the callout title in Obsidian and
  nothing in a converted document references them. The one exception is a
  PDF that refers to its own items ("by Lemma 2.3", "see (4)"). Label only
  those targets, so the reference can become `[#label]`/`[@eq:label]`.
- **Other documents** (lecture notes, papers): each numbered statement
  becomes a declared environment opened by `**Name**` and closed by `∎`,
  per the `lavatex` skill, again without labels unless referenced.
- **Text:** keep it verbatim, including the author's typos. Report them to
  the user instead of fixing them silently.
- **Title:** a `|` block with `\` at line ends for line breaks. Escape
  anything pandoc would read as Markdown at a line start: `1\. Exercise
  sheet`, not `1. Exercise sheet`, which becomes a list item. Header
  material without a frontmatter field (university, lecturer, semester)
  goes into one plain line at the top of the body.
- **Math:** use the PDF's notation exactly. Display math goes in
  `$$ … $$`, multi-line environments inside it. New commands go in
  `macros:`, never inline `\newcommand` in prose.

### Images

- **Raster images** (listed by `pdfimages -list`): copy the extracted
  `img-NNN.png` into the vault's attachments folder (look where existing
  `![[…]]` embeds live, e.g. `Contents/`). Give it a descriptive name
  (`alg-geo-1-ex3-figure.png`) and embed it with `![[name.png|width]]`,
  where the width is in px and matches the original's relative size.
  `![[name.png|Caption text]]` gives a captioned figure.
- **Vector graphics** (a drawing that isn't listed as an image): rebuild
  it as a `tikz` block if it's a diagram, otherwise crop it from the page
  render at higher resolution
  (`pdftoppm -r 300 -x … -y … -W … -H … -png`) and embed that PNG.
- Never leave an image out silently. If it's purely decorative (a logo),
  say you skipped it.

### Diagrams

- **Inline arrow notation** in a sentence stays inline math:
  `X \overset{f}{\underset{g}{\rightrightarrows}} Y`,
  `\xrightarrow{\sim}`, `\hookrightarrow`, `\twoheadrightarrow`.
- **Commutative diagrams** (squares, exact rows) become a ` ```tikz `
  block. The vault's examples (`examples/snake-lemma.md`) use the
  `matrix of math nodes` style, which is known to render in both TikZJax
  and the PDF:
  ````markdown
  ```tikz
  \begin{document}
  \usetikzlibrary{matrix, arrows.meta}
  \begin{tikzpicture}[>=Stealth]
  \matrix (m) [matrix of math nodes, row sep=3em, column sep=3em] {
    A & B \\
    C & D \\
  };
  \draw[->] (m-1-1) -- node[above]{$f$} (m-1-2);
  \draw[->] (m-1-1) -- node[left]{$g$} (m-2-1);
  \draw[->] (m-1-2) -- node[right]{$h$} (m-2-2);
  \draw[->] (m-2-1) -- node[below]{$k$} (m-2-2);
  \end{tikzpicture}
  \end{document}
  ```
  Figure: The square commutes. {#fig:square}
  ````
  `tikz-cd` is shorter, but only use it after `obsidian_render_check.sh`
  confirms TikZJax renders it in this vault. The PDF side then needs
  `\usepackage{tikz-cd}` in the preamble. Drop the `Figure:` line for a
  diagram that sits in the flow of text rather than as a numbered figure.
- **Test every diagram both ways** (step 4). A diagram that compiles can
  still fail to render live, and the other way round.

## 4. Validate (all three, every time)

1. **Compile:**
   ```sh
   node <lavatex-skill-dir>/scripts/check_note.mjs <vault> "<note path>" --defaults "<default note>"
   ```
   Fix everything until it ends with `✓ compiled` and prints no `!` lines.
   The checker writes `<note>.tex/.pdf` next to the note, which the
   plugin would do anyway. It prefers the vault's installed plugin
   template. To test a LavaTex repo change, copy the note plus `Util/` to
   a scratch folder and set `LAVATEX_ASSETS=<repo>/latex-exporter/pandoc`.
2. **Compare with the original:**
   ```sh
   sh <skill-dir>/scripts/render_compare.sh <original.pdf> "<vault>/<note>.pdf" <scratch-dir>
   ```
   Read `original-N.png` and `exported-N.png` page by page. Check:
   - title block, numbering, italic vs upright bodies,
   - every symbol and math alphabet,
   - diagrams and arrow labels, image placement and size.

   A passing compile says nothing about these.
3. **Check the Obsidian rendering:**
   ```sh
   sh <skill-dir>/scripts/obsidian_render_check.sh <vault-name> "<note path>"
   ```
   This opens the note in reading view in the running Obsidian and reports
   the formula and diagram counts and any MathJax/TikZJax errors. It needs
   the Obsidian CLI and acts only if the CLI's active vault matches.
   Otherwise it prints "wrong vault", and you should ask the user to switch
   to that vault. For a visual check, `obsidian dev:screenshot
   path="_check.png"` writes into the **vault root**: move the file out
   immediately.

## 5. Report

Before reporting, check that the note contains nothing beyond the PDF's
content: no solutions, proof attempts or added hints (see the rule at the
top).

Tell the user:
- where the note is,
- the frontmatter choices you made (environments, theorem style, preamble
  additions),
- each image and diagram and how it was ported,
- typos you kept verbatim,
- what was tested (compile, side-by-side, Obsidian rendering),
- anything you couldn't reproduce exactly.
