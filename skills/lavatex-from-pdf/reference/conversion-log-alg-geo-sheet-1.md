# Worked conversion: Algebraic Geometry I, exercise sheet 1

Source: `Blatt-1-Alg-Geo-2026.pdf` (Universität Regensburg, Prof. Kings,
WS 2026/27), 1 page, made by pdfTeX. Target:
`Winter2627/Algebraische Geometrie/Sheet 1.md`. This is the record of
what was done, in order, including what went wrong the first time.

## 1. Inspect

- `inspect_pdf.sh`: Creator "LaTeX with hyperref", 1 page, **no embedded
  images**. All content is text plus math, and the only "diagram" is the
  parallel arrow pair in Exercise 3, typeset as math (not a picture).
- The `pdftotext` output was useless for the math: `HomC ∧ (hX , F ) ∼ =`,
  the `f`/`g` arrow labels floated onto separate lines, and `lim` came out
  with its `←−` and `i∈I` on the lines below. **The page render was the
  source of truth.** From it:
  - `\mathscr C` (script C, not `\mathcal`), with a `^\wedge` superscript:
    `\operatorname{Hom}_{\mathscr C^\wedge}(h_X, F)`.
  - `\cong` for "≅", `Y/{\sim}` for "Y/∼" (the braces fix the spacing).
  - Exercise 3's `X ⇉ Y` with `f` above and `g` below:
    `X \overset{f}{\underset{g}{\rightrightarrows}} Y`. It's inline in the
    sentence, so it stays inline math. A `tikz` block can't sit inside a
    sentence.
  - Exercise 4's limits are `\varprojlim_{i \in I}` (arrow under "lim").
  - Exercise bodies are **upright**, so amsthm's `definition` style, not
    the default italic `plain`.
  - Numbering is plain `Exercise 1.`–`4.`, not `1.1`.

## 2. Vault conventions

- Winter2627 has `Util/preamble.md` (mathtools, amsthm, mathrsfs for
  `\mathscr`, hyperref, tikz …), `Util/theorems.md`, `Util/macros.md`,
  `Util/problem-theorems.md` (Task/Note), and a **Default frontmatter**
  note (`Util/Default frontmatter.md`, set in the plugin's `data.json`)
  supplying author, date, layout, preamble, theorems and macros.
- So the note only sets what differs: title, date, an `exercise`
  environment and the theorem style.

## 3. Write

- `theorems:` replaces the default's list as a whole (fields merge key by
  key), so it relists `[[theorems]]` and `[[problem-theorems]]` and adds
  `{id: exercise, name: Exercise}`. With neither `counter:` nor `like:`
  this declares a plain counter (`\newtheorem{exercise}{Exercise}`), which
  gives 1, 2, 3, 4. That case needed a template change in LavaTex
  (`$elseif(theorems.like)$`); older templates emit
  `\newtheorem{exercise}[]{Exercise}`, which happens to work too.
- Upright bodies: `preamble:` as a list, `"[[preamble]]"` followed by
  `\theoremstyle{definition}`. The preamble comes before the template's
  `\newtheorem` lines, so the style applies to them.
- Each exercise was first written as `**Exercise** {#ex-…}` … `∎`, with a
  descriptive label (removed later, see below).
- Title: `Algebraic Geometry I\` + newline + `1\. Exercise sheet` in a `|`
  block. **The first attempt without the `\` before `.` rendered "1. Exercise
  sheet" as an ordered-list item.** Pandoc reads the title as Markdown.
  The course/lecturer/semester header (left/right columns in the
  original) became one plain line at the top. The due date is `date:`.
- The text is kept verbatim, including the sheet's own typo ("Proof the
  statement" for "Prove"). It's the lecturer's wording, so it isn't
  corrected silently; mention such things to the user instead.
- `\Big( … \Big)` in Exercise 4 was replaced by plain parentheses to match
  the original.

### Restructured to the sheet convention

The user then asked for their sheet convention instead of `**Exercise**`
blocks. Each exercise got an h1 (`# Exercise 1` …) and its statement went
verbatim into a `> [!task] Problem Statement` callout, with every
line `> `-prefixed, display math included. The note's own `theorems:` was
dropped: the default frontmatter already links `[[problem-theorems]]`,
which declares `task`. The PDF now reads "1 Exercise 1" / "Task 1.1
(Problem Statement)". No solutions were written: the space under each
callout is left for the user.

Finally the user asked to **remove the `{#ex-…}` labels**. Nothing on the
sheet references its exercises, and the labels only cluttered the callout
titles. The skill now says not to add labels unless the PDF itself
cross-references that item.

## 4. Validate

- `check_note.mjs <vault> "Algebraische Geometrie/Sheet 1.md" --defaults
  "Util/Default frontmatter.md"` compiled with no warnings. The checker
  uses the **vault's installed** plugin template first, so a template
  change in the repo has to be tested in a scratch copy of the vault with
  `LAVATEX_ASSETS=<repo>/latex-exporter/pandoc`.
- `render_compare.sh` then compared original and export side by side.
  This is what caught both the list-item title and the italic bodies.
  The checker passes on both.
- `obsidian_render_check.sh Winter2627 "Algebraische Geometrie/Sheet 1.md"`
  reported 28 formulas, 0 MathJax errors (25 after the callout
  restructure, also 0 errors). So `\mathscr`, `\varprojlim` and
  the stacked arrows also render in the editor, not just in the PDF.
- The screenshot from `obsidian dev:screenshot` lands **inside the
  vault**. Move it out right away.
