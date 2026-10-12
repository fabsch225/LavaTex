---
title: The Snake Lemma
author: Fabian Schuller
date: \today
fontsize: 12pt
margin: 1in
refname: References
proofname: Proof
preamble: |
  \usepackage{amsmath, amssymb, amsthm}
  \usepackage[hidelinks]{hyperref}
  \usepackage{tikz}
  \usetikzlibrary{matrix, arrows.meta}
theorems:
  - {id: definition, name: Definition, counter: section}
  - {id: lemma, name: Lemma, like: definition}
  - {id: theorem, name: Theorem, like: definition}
  - {id: proposition, name: Proposition, like: definition}
  - {id: corollary, name: Corollary, like: definition}
  - {id: remark, name: Remark, like: definition}
---

# The Snake Lemma

The Snake Lemma is the standard diagram-chasing tool that produces a long
exact sequence out of a short exact sequence of chain complexes — see
[#cor-les] below. This note states and proves it for modules over a
(commutative) ring $R$; the same argument goes through verbatim in any
abelian category, reading "element" as "generalized element" throughout
&[[Weibel]].

## Setup and statement

**Definition** (Exact sequence)
A sequence of $R$-module homomorphisms
$$
\cdots \longrightarrow M_{n+1} \xrightarrow{\ \varphi_{n+1}\ } M_n \xrightarrow{\ \varphi_n\ } M_{n-1} \longrightarrow \cdots
$$
is *exact at $M_n$* if $\operatorname{im}\varphi_{n+1} = \ker\varphi_n$. A
short exact sequence is one of the form $0 \to A \to B \to C \to 0$, exact
at $A$, $B$, and $C$ — equivalently, $A \to B$ is injective, $B \to C$ is
surjective, and the image of the first equals the kernel of the second.

Suppose we are given a commutative diagram of $R$-modules with exact rows

```tikz
\begin{document}
\usetikzlibrary{matrix, arrows.meta}
\begin{tikzpicture}[>=Stealth]
\matrix (m) [matrix of math nodes, row sep=3em, column sep=2.5em,
  text height=1.6ex, text depth=0.3ex] {
  0 & A' & A & A'' & 0 \\
  0 & B' & B & B'' & 0 \\
};
\draw[->] (m-1-1) -- (m-1-2);
\draw[->] (m-1-2) -- node[above]{$f'$} (m-1-3);
\draw[->] (m-1-3) -- node[above]{$f$} (m-1-4);
\draw[->] (m-1-4) -- (m-1-5);
\draw[->] (m-2-1) -- (m-2-2);
\draw[->] (m-2-2) -- node[above]{$g'$} (m-2-3);
\draw[->] (m-2-3) -- node[above]{$g$} (m-2-4);
\draw[->] (m-2-4) -- (m-2-5);
\draw[->] (m-1-2) -- node[left]{$\alpha$} (m-2-2);
\draw[->] (m-1-3) -- node[left]{$\beta$} (m-2-3);
\draw[->] (m-1-4) -- node[left]{$\gamma$} (m-2-4);
\end{tikzpicture}
\end{document}
```
Figure: Two short exact rows, connected by three vertical maps making both squares commute. {#fig:snake-diagram}

so $\beta f' = g'\alpha$ and $\gamma f = g \beta$.

**Lemma** (Snake Lemma) {#lem-snake}
Given the diagram in [#fig:snake-diagram], there is an exact sequence
$$
0 \to \ker\alpha \to \ker\beta \to \ker\gamma \xrightarrow{\ \delta\ } \operatorname{coker}\alpha \to \operatorname{coker}\beta \to \operatorname{coker}\gamma \to 0,
$$
{#eq:snake-sequence}
where the unlabelled maps are induced by $f, f', g, g'$, and $\delta$ — the
*connecting homomorphism* — is constructed in the proof.

**Proof**
We first construct $\delta$, then check exactness at each of the six terms
in [#eq:snake-sequence].

*Construction of $\delta$.* Let $x \in \ker\gamma \subset A''$. Since $f$ is
surjective (exactness of the top row at $A''$), choose $a \in A$ with
$f(a) = x$. Then
$$
g(\beta(a)) = \gamma(f(a)) = \gamma(x) = 0,
$$
so $\beta(a) \in \ker g = \operatorname{im} g'$ (exactness of the bottom row
at $B$). Since $g'$ is injective, there is a *unique* $b' \in B'$ with
$g'(b') = \beta(a)$. Define
$$
\delta(x) := \overline{b'} \in \operatorname{coker}\alpha = B'/\operatorname{im}\alpha.
$$

*Well-definedness.* Suppose $\tilde a \in A$ is another preimage of $x$
under $f$. Then $a - \tilde a \in \ker f = \operatorname{im} f'$, so
$a - \tilde a = f'(a')$ for some $a' \in A'$. Writing $\tilde b'$ for the
element of $B'$ with $g'(\tilde b') = \beta(\tilde a)$, we get
$$
g'(b' - \tilde b') = \beta(a) - \beta(\tilde a) = \beta(f'(a')) = g'(\alpha(a')),
$$
and since $g'$ is injective, $b' - \tilde b' = \alpha(a')$. Hence $b'$ and
$\tilde b'$ have the same image in $\operatorname{coker}\alpha$, so
$\delta(x)$ does not depend on the choice of $a$. Linearity of $\delta$
follows directly from linearity of $f$, $\beta$, and $g'^{-1}$ on its image,
applied to a sum $x_1 + x_2$ via preimages $a_1 + a_2$.

*Exactness at $\ker\alpha$.* The map $\ker\alpha \to \ker\beta$ is the
restriction of $f'$, hence injective because $f'$ already is.

*Exactness at $\ker\beta$.* Let $a \in \ker\beta$ with $f(a) = 0$; then
$a \in \ker f = \operatorname{im} f'$, so $a = f'(a')$ for some
$a' \in A'$. Now $g'(\alpha(a')) = \beta(f'(a')) = \beta(a) = 0$, and $g'$
injective forces $\alpha(a') = 0$, i.e. $a' \in \ker\alpha$. So
$\ker(f|_{\ker\beta}) \subset \operatorname{im}(f'|_{\ker\alpha})$; the
reverse inclusion is immediate since $f f' = 0$. This is exactness at
$\ker\beta$.

*Exactness at $\ker\gamma$.* If $a \in \ker\beta$, then in the construction
of $\delta(f(a))$ we may take $a$ itself as the preimage of $f(a)$, giving
$\beta(a) = g'(0)$, so $\delta(f(a)) = \overline{0} = 0$: the composite
$$
\ker\beta \to \ker\gamma \xrightarrow{\delta} \operatorname{coker}\alpha
$$
is zero. Conversely, if $\delta(x) = 0$ for $x \in \ker\gamma$, then with
$a, b'$ as in the construction, $\overline{b'} = 0$ means
$b' = \alpha(a')$ for some $a' \in A'$; then
$$
\beta(a - f'(a')) = \beta(a) - \beta(f'(a')) = g'(b') - g'(\alpha(a')) = g'(b') - g'(b') = 0,
$$
so $a - f'(a') \in \ker\beta$, and $f(a - f'(a')) = f(a) - 0 = x$. Hence $x$
is the image of an element of $\ker\beta$.

*Exactness at $\operatorname{coker}\alpha$.* If $b' \in B'$ arises from the
construction of $\delta(x)$ for some $x \in \ker\gamma$, its image under
$B' \to B \to \operatorname{coker}\beta$ is $\overline{\beta(a)}$, and
$\beta(a) \in \operatorname{im}\beta$ by definition — so the composite
$$
\ker\gamma \xrightarrow{\delta} \operatorname{coker}\alpha \to \operatorname{coker}\beta
$$
is zero. Conversely, suppose $b' \in B'$ maps to
$0$ in $\operatorname{coker}\beta$, i.e. $g'(b') = \beta(a)$ for some
$a \in A$. Let $x := f(a)$; then
$$
\gamma(x) = \gamma(f(a)) = g(\beta(a)) = g(g'(b')) = 0,
$$
so $x \in \ker\gamma$, and by construction $\delta(x) = \overline{b'}$. So
$\overline{b'} \in \operatorname{im}\delta$.

*Exactness at $\operatorname{coker}\beta$ and $\operatorname{coker}\gamma$.*
These are dual to exactness at $\ker\alpha$ and $\ker\beta$ respectively —
surjectivity of $\operatorname{coker}\beta \to \operatorname{coker}\gamma$
follows from surjectivity of $g$, and exactness at $\operatorname{coker}\beta$
follows the same diagram chase as exactness at $\ker\beta$, run in the
opposite direction along $g, g'$ instead of $f, f'$.
∎
∎

**Remark**
The construction of $\delta$ is exactly what "diagram chasing" means in
practice: every step either follows an existing arrow or invokes exactness
at one node to replace an element by a preimage — never anything more
exotic. The same five-step pattern (choose a preimage, apply a map, use
exactness to descend, apply an inverse map, project to a cokernel) is the
template for the connecting homomorphisms that appear throughout homological
algebra &[[Lang-Algebra]].
∎

## An application: the long exact sequence in homology

**Corollary** (Long exact homology sequence) {#cor-les}
Let $0 \to A_\bullet \to B_\bullet \to C_\bullet \to 0$ be a short exact sequence
of chain complexes of $R$-modules (a short exact sequence of
modules in every degree, commuting with the differentials). Then there is a
long exact sequence
$$
\cdots \to H_n(A_\bullet) \to H_n(B_\bullet) \to H_n(C_\bullet)
\xrightarrow{\ \partial\ } H_{n-1}(A_\bullet) \to H_{n-1}(B_\bullet) \to H_{n-1}(C_\bullet) \to \cdots
$$

**Proof**
Apply the Snake Lemma ([#lem-snake]) to the diagram with rows
$$
A_n/\operatorname{im}\partial_{n+1} \to B_n/\operatorname{im}\partial_{n+1} \to C_n/\operatorname{im}\partial_{n+1} \to 0
$$
and
$$
0 \to \ker\partial_{n-1}^A \to \ker\partial_{n-1}^B \to \ker\partial_{n-1}^C,
$$
both exact by the snake lemma's own hypotheses
applied one degree at a time, with vertical maps induced by the degree-$n$
differentials. The resulting six-term exact sequence
$$
\ker\partial_n^A/\!\operatorname{im} \to \ker\partial_n^B/\!\operatorname{im} \to \ker\partial_n^C/\!\operatorname{im} \xrightarrow{\delta} \operatorname{coker} \to \operatorname{coker} \to \operatorname{coker}
$$
is exactly
$$
H_n(A_\bullet) \to H_n(B_\bullet) \to H_n(C_\bullet) \xrightarrow{\partial} H_{n-1}(A_\bullet) \to H_{n-1}(B_\bullet) \to H_{n-1}(C_\bullet)
$$
once the two cokernel/kernel identifications above are
unwound; splicing these six-term sequences together for every $n$ gives the
claimed long exact sequence, with $\partial$ the connecting homomorphism
$\delta$ from [#lem-snake] &[[Weibel]].
∎
