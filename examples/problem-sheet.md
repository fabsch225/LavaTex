---
title: Problem Sheet
author: Fabian Schuller
date: \today
fontsize: 12pt
margin: 1in
proofname: Proof
preamble: "[[preamble]]"
theorems:
  - "[[theorems]]"
  - "[[problem-theorems]]"
---

# Task 1
## a)
In euclidian geometry, a line intersects a plane exactly once, if they are'nt parallel. Since the $z$-coordinate of $x$ is below that of $N$, this is the case

## b)
We derive an explicit formula for $\pi$:
$$\ell_x : N + \lambda  (x-N) = \begin{pmatrix}
\lambda x_1  \\
\lambda x_2 \\
1 + \lambda (x_3 -1 )
\end{pmatrix}, \lambda \in \mathbb R$$
where $1 + \lambda (x_3 -1 ) = 0 \iff \lambda = \frac{1}{z-1}$. Hence
$$\pi(x) = \left ( \frac{x_1}{x_3-1}, \frac{x_2}{x_3 -1} \right ).$$
This is continuous as its components are rational.

## c)
We extend $\pi(N)=\infty$. It remains to show (sequence-)continuity at $N$ by showing 
$$
\lim_{x \to N} |\pi(x)| = \infty.
$$
Consider
$$|\pi(x)|^2 = \frac{x_1^2 + x_2^2}{(x_3-1)^2} = \frac{1 - x_3^2}{(x_3-1)^2}= \frac{1+x_3}{1-x_3}$$
which goes to $\infty$ as $x_3 \to 1$, which is implied by $x \to N$.

# Task 2

> [!task] Problem Statement
> Let $X$ be a RS with complex atlas $\mathcal A$, $Y \subseteq X$ open, $f : Y \to \mathbb C$. Show that $f$ is holomorphic on $Y$ iff for every chart $Y : U \to V$ in $\mathcal A$, the composition $f \circ \psi^{-1}$ is holomorphic on $Y(U \cap Y)$.


> [!note] Remark
> We defined "holomorphic" the same way, but using $\psi \in \mathcal A^*$.

($\Rightarrow$) Clear since $\mathcal A \subseteq \mathcal A^*$.
($\Leftarrow$) Let $\psi \in \mathcal A^*$ be a chart: $\psi : U \to \mathbb C$, $U \subseteq X$. 
Want to show: $f \circ \psi$ is holomorphic.
Consider $q \in U$ and a chart $\varphi \in \mathcal A$ such that $\varphi : V \to \mathbb C$ with $q \in V$. Then
$$f \circ \psi^{-1} |_{U \cap V} = (f \circ \varphi ^{-1}) \circ (\varphi  \circ \psi^{-1})|_{U \cap V}$$
is holomorphic as the composition of

- $(f \circ \varphi ^{-1})$ holomorphic by assumption
- $(\varphi  \circ \psi^{-1})$ holomorphic since all charts in $\mathcal A^*$ and $\mathcal A$ are compatible
