---
title: Compactness and Continuous Maps
author: Jane Doe
date: \today
fontsize: 12pt
margin: 1in
proofname: Proof
refname: References
preamble: |
  \usepackage{amsmath, amssymb, amsthm}
  \usepackage[hidelinks]{hyperref}
  \usepackage{tikz}
  \usetikzlibrary{arrows.meta}
  \usepackage{listings}
  \lstset{language=Python, basicstyle=\ttfamily\small, frame=single}
theorems:
  - {id: definition, name: Definition, counter: section}
  - {id: theorem, name: Theorem, like: definition}
  - {id: lemma, name: Lemma, like: definition}
  - {id: corollary, name: Corollary, like: definition}
  - {id: remark, name: Remark, like: definition}
macros: |
  \newcommand{\R}{\mathbb{R}}
  \newcommand{\norm}[1]{\left\lVert #1 \right\rVert}
---

# Compact sets

Throughout, $(X, d)$ is a metric space. We follow &[[Rudin]] closely; the
main result is [#thm-extreme], which rests on [#lem-image].

**Definition** (Compactness) {#def-compact}
A set $K \subseteq X$ is *compact* if every open cover of $K$ has a finite
subcover.
∎

**Lemma** (Continuous images; &[[Rudin]] Thm. 4.14) {#lem-image}
If $f \colon X \to Y$ is continuous and $K \subseteq X$ is compact, then
$f(K)$ is compact.

**Proof**
Let $(V_\alpha)$ be an open cover of $f(K)$. By continuity each
$f^{-1}(V_\alpha)$ is open, and together they cover $K$, so finitely many
suffice:
$$
K \subseteq f^{-1}(V_{\alpha_1}) \cup \dots \cup f^{-1}(V_{\alpha_n}).
$$
{#eq:finite-cover}
Applying $f$ to [@eq:finite-cover] gives $f(K) \subseteq V_{\alpha_1} \cup \dots \cup V_{\alpha_n}$.
∎
∎

# Extreme values

**Theorem** (Extreme value theorem) {#thm-extreme}
Let $K \subseteq X$ be compact and non-empty and $f \colon K \to \R$
continuous. Then there are $p, q \in K$ with
$$
f(p) = \sup_{x \in K} f(x), \qquad f(q) = \inf_{x \in K} f(x).
$$
{#eq:extremes}
∎

**Proof**
By Lemma [#lem-image], $f(K) \subseteq \R$ is compact, hence closed and
bounded. A closed bounded non-empty subset of $\R$ contains its supremum
and infimum, which gives [@eq:extremes].
∎

**Corollary** {#cor-norm}
On $\R^n$, the continuous function $x \mapsto \norm{x}$ attains a minimum on
every non-empty compact set.
∎

**Remark**
Compactness cannot be dropped: $f(x) = x$ on $(0, 1)$ attains neither
bound. See Section [#compact-sets] for the definition used here, and
Figure [#fig:image] for the picture.
∎

```tikz
\begin{document}
\usetikzlibrary{arrows.meta}
\begin{tikzpicture}[>=Stealth]
\draw (0,0) ellipse (1 and 0.6) node {$K$};
\draw (4,0) ellipse (0.8 and 0.5) node {$f(K)$};
\draw[->] (1.1,0.2) to[bend left] node[above] {$f$} (3.1,0.2);
\end{tikzpicture}
\end{document}
```
Figure: A continuous map sends the compact set $K$ to the compact set $f(K)$. {#fig:image}

A numerical illustration, with the language set once via `\lstset` in the preamble:

```python
import numpy as np
xs = np.linspace(0, 1, 1001)
print(max(xs * (1 - xs)))   # attained at x = 1/2
```

<!--
The citation above needs a source note anywhere in the vault, e.g. Sources/Rudin.md:

---
key: rudin1976
bibitem: |-
  \bibitem[Rud76]{rudin1976}
  Rudin, Walter. 1976. Principles of Mathematical Analysis. 3rd ed. McGraw-Hill.
---
-->
