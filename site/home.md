# LavaTex

**LavaTex** is an opinionated Obsidian plugin for writing math in Obsidian
and exporting it to production-ready, collaborator-friendly LaTeX. It's a
thin layer on top of `pandoc` + `pandoc-crossref` — the plugin's own code
is only the pieces pandoc doesn't provide: a friendlier note-editing syntax,
and live math-macro rendering in Obsidian's own editor.

- **[Architecture](architecture.html)** — how a note becomes a `.tex` file,
  and how the live-preview math macros work. Diagrammed.
- **[Spec](spec.html)** — the exact markdown superset LavaTex reads:
  frontmatter fields, bold-statement theorem syntax, reference shortcuts,
  and where raw LaTeX is still the right tool.

## Quick example

```
**Lemma** (\kk S.21f) {#lem-gitter-invariant}
Man nennt
$$
\delta := \delta(\omega_1, \omega_2)
$$

**Beweis**
Betrachte ...
∎
```

exports to a real `\begin{lemma}[\kk S.21f]\label{lem-gitter-invariant}...`
environment, numbered and cross-referenceable, with a matching
`\begin{proof}...\end{proof}`.

See the [repo README](https://github.com/fabsch225/LavaTex#readme) for
install steps and a full worked example (a real paper, converted and
re-exported byte-for-byte equivalent to the hand-written original).
