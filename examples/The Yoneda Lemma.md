**Definition** (Functor Category)
A **morphism of functors** $\varphi : F \to G$, $F, G : \mathsf C \to \mathsf D$
consists of morphisms $\varphi_X : F(X) \to G(X)$ $\forall X \in \mathsf C$ such that $\forall f : X \to Y$ the diagram

```tikz
\usepackage{tikz-cd}
\usepackage{amssymb}
\begin{document}
\begin{tikzcd} {F(X)} && {G(X)} \\ {F(Y)} && {G(Y)} \arrow["{\varphi_X}", from=1-1, to=1-3] \arrow["{F(f)}"', from=1-1, to=2-1] \arrow["{G(f)}", from=1-3, to=2-3] \arrow["{\varphi_Y}", from=2-1, to=2-3]
\end{tikzcd}
\end{document}
```
commutes.

We denote by $\operatorname{Fun}(\mathsf C, \mathsf D)$ or $\mathsf D^{\mathsf C}$ the **functor category**
- with objects $F : \mathsf C \to \mathsf D$
- and morphisms the morphisms of functors
∎

**Definition** (fully, faithful)
A functor $F : \mathsf C \to \mathsf D$ is faithful (resp. full, resp. fully faithful) if 
$$\forall X, Y \in \mathsf C : F : \text{Hom}_\mathsf{C}(X, Y) \to \text{Hom}_\mathsf{D}(F(X), F(Y))
$$
is injective (resp. surjective, resp. bijective). (As Sets.)
∎

> [!theorem] 
> Let $\mathsf C$ be a category and $\mathsf C^\wedge := \operatorname{Fun}(\mathsf C^\mathrm{opp}, \mathsf{Set})$. The functor $h_\bullet : \mathsf C \to \mathsf C^\wedge$, $x \mapsto h_x$, $f \mapsto h_\bullet(f)$ is **fully faithful** and has an isomorphism of bifunctors $\phi : \text{Hom}_{\mathsf C^\wedge}(h_\bullet, \_) \cong \operatorname{ev(\cdot, \_)}$.
> 
> ---
> Then $\forall X \in \mathsf C$ and $\forall F \in \mathsf C^\wedge$ one has a bijection
> $$\Phi_{X, F} : \text{Hom}_{\mathsf C^\wedge}(h_X, F) \cong F(X)$$
> functorial in $X, F$ and fully faithful means
> $$\text{Hom}_{\mathsf C^\wedge}(h_X, h_Y) \cong \text{Hom}_\mathsf{C}(X, Y)$$

**Proof**

∎