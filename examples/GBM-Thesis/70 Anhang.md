# Notation und Ergebnisse aus der Stochastik

## Notation

- $E(X)$ bzw. $E[X]$ - Erwartungswert
- $V(X)$ bzw. $V[X]$ - Varianz
- $X \sim \mathcal N(\mu, \sigma^2)$ - normalverteilte Zufallsvariable mit Erwartungswert $\mu$ und Varianz $\sigma^2$
- $(\Omega, \mathcal F, P)$ - Wahrscheinlichkeitsraum
- $W_t$ - Brownsche Bewegung (Wiener-Prozess)
- $\mathbf 1_A(\omega)$ - nimmt $1$ an, falls $\omega \in A$, sonst $0$. Mit $\mathbf 1_{\{f > 0\}}$ ist $1_A$ mit $A=f^{-1}((0, \infty))$ gemeint
- $O(x)$ - beliebiger Term, der sich (im Limes) linear zu $x$ verhält bzw. Menge der Funktionen die sich so verhalten
  $$\lim_{x \to x_0} \left \vert \frac{f(x)}{g(x)} \right \vert  < M \iff f \in O(g(x))$$
- $o(x)$ - beliebiger Term, der (im Limes) schneller als $x$ verschwindet
  $$\lim_{x \to x_0} \frac{f(x)}{g(x)} = 0 \iff f \in o(g(x))$$
- $L^2(\Omega)$ - Der normierte Vektorraum der Zufallsvariablen $X : \Omega \to \Bbb R$, wobei $E(X^2) < \infty$ ist
- i.i.d. - Die Zufallsvariablen sind stochastisch Unabhängig und identisch verteilt
- GBM - geometrische Brownsche Bewegung
- CEV - Constant Elasticity of Variance (Modell)
- MSE - Mean Squared Error
- NRMSE - Normalized Root Mean Squared Error
- RMSE - Root Mean Squared Error
- MAPE - Mean Absolute Percentage Error

## Konvergenzbegriffe

- $X_n \xrightarrow{\mathrm{pktw.}} X$ - punktweise Konvergenz (Für jedes $\omega \in \Omega$ gilt: $X_n(\omega) \to X(\omega)$)
- $X_n \xrightarrow{\mathrm{glm.}} X$ - gleichmäßige Konvergenz (Für jede $\varepsilon > 0$ gilt: $\sup_{\omega \in \Omega} |X_n(\omega) - X(\omega)| < \varepsilon$ für $n$ groß genug)
- $X_n \xrightarrow{\mathrm{d}} X$ - Konvergenz in Verteilung (Die Verteilungsfunktion $F_{X_n}$ von $X_n$ konvergiert punktweise gegen die Verteilungsfunktion $F_X$ von $X$, mindestens an den Stetigkeitsstellen von $F_X$)
- $X_n \xrightarrow{\mathrm{f.s.}} X$ - fast sichere Konvergenz (Für fast alle $\omega \in \Omega$ gilt: $X_n(\omega) \to X(\omega)$)

Auf das Verhältnis zwischen den Konvergenzbegriffen wird bei Bedarf eingegangen.

## Ergebnisse aus der Stochastik

**Satz** (Cramér-Wold-Technik, Henze 2023 &[[Henze-Stochastik]] S. 225) {#satz-cramer_wold}
Seien $(X_n)_{n \in \Bbb N}$ und $X$ Zufallsvektoren in $\Bbb R^d$. Dann sind folgende Aussagen äquivalent:

1. $X_n \xrightarrow{d} X$ für $n \to \infty$.
2. Für alle $t \in \Bbb R^d$ gilt $t^T X_n \xrightarrow{d} t^T X$ für $n \to \infty$.

Wird hier nicht bewiesen.
∎

Die Cramér-Wold-Technik erlaubt es, mehrdimensionale Verteilungskonvergenz auf eindimensionale Berechnungen zurückzuführen.

**Satz** (Zentraler Grenzwertsatz von Lindeberg-Feller, Henze 2023 &[[Henze-Stochastik]] S. 223) {#satz-lindeberg_feller}
Die Zufallsvariablen $X_{ni}, 1 \le i \le k_n \to \infty$ seien für jedes $n \in \Bbb N$ stochastisch unabhängig mit
$E(X_{ni})=0$ und $\sigma^2_{ni} = \text{Var}(X_{ni}) < \infty$.
Setze $s_n^2 = \sum_{i=1}^{k_i} \sigma_{ni}^2$. Gilt die Lindeberg-Bedingung
$$(L) \quad \lim_{n \to \infty} L_n(\varepsilon) = \lim_{n \to \infty} \frac{1}{s_n^2} \sum_{i=1}^{k_n} E(X^2_{ni} 1_{\{\vert X_{ni} \vert > \varepsilon s_n\}})=0, \quad \forall \varepsilon > 0,$$
Dann folgt
$$\frac{1}{s_n} \sum_{i=1}^{k_n} X_{ni} \underset{n \to \infty}{\overset d \longrightarrow} \mathcal N(0,1).$$
Wird hier nicht bewiesen.
∎

**Lemma** (Reihenkriterium für fast sichere Konvergenz, Henze 2023 &[[Henze-Stochastik]] S. 201) {#lemma-reihenkriterium}
Sei $(X_n)_{n \in \Bbb N}$ eine Folge von Zufallsvariablen. Wenn es eine Reihe $\sum_{n=1}^\infty a_n < \infty$ mit $a_n \geq 0$ gibt, so dass
$$P(|X_n| > \varepsilon) \leq a_n \quad \text{für alle } n \in \Bbb N \text{ und jedes } \varepsilon > 0,$$
dann konvergiert $X_n$ fast sicher gegen $0$, d.h.
$$P\left(\lim_{n \to \infty} X_n = 0\right) = 1.$$
Wird hier nicht bewiesen.
∎

**Satz** (Satz von Pratt, Elstrodt &[[Elstrodt]] S. 280, vereinfacht) {#satz-pratt}
Dieser Satz erlaubt es, den Grenzübergang und den Erwartungswert zu vertauschen.
Sei $(X_n) \longrightarrow X$ eine Folge von Zufallsvariablen, die fast-überall konvergiert,
und $(Y_n) \longrightarrow Y$, $(Z_n) \longrightarrow Z$ ebenfalls.
Gilt (1) $Y_n \le X_n \le Z_n$ und (2) $E(Y_n) \longrightarrow E(Y)$, $E(Z_n) \longrightarrow E(Z)$,
dann folgt $E(X_n) \longrightarrow E(X)$. Wird hier nicht bewiesen.
∎

**Definition und Lemma** (Monte-Carlo-Verfahren) {#defprop-monte_carlo}
Monte-Carlo-Verfahren sind stochastische Simulationsmethoden, die zur numerischen
Lösung von Problemen verwendet werden, insbesondere zur Berechnung von Integralen
und Erwartungswerten. Sie basieren auf der Erzeugung von Zufallszahlen und
der statistischen Analyse der Ergebnisse. Man verwendet den *Monte-Carlo-Schätzer*
$$
\hat{I}_n = \frac{1}{n} \sum_{i=1}^n f(X_i),
$$
wobei $X_1, X_2, \ldots, X_n$ unabhängige und identisch verteilte Zufallsvariablen
sind, die der Verteilung von $X$ folgen. Der Schätzer konvergiert fast sicher
gegen den wahren Erwartungswert $I = E[f(X)]$, wenn $n \to \infty$.

**Beweis**
Nach dem Gesetz der großen Zahlen gilt
$$\hat{I}_n \longrightarrow E[f(X)] = I, \quad \text{fast sicher.}$$
∎
∎

**Satz** (Borel-Cantelli-Lemma, Henze 2023 &[[Henze-Stochastik]] S. 65f.) {#satz-borel_cantelli}
Sei $(\Omega,\mathcal F, P)$ ein Wahrscheinlichkeitsraum und $(A_n)_{n\in\mathbb N}$ eine Folge von Ereignissen. Es bezeichne
$$
\limsup_{n\to\infty} A_n \;=\; \{\omega\in\Omega:\ \omega\in A_n\text{ für unendlich viele }n\}.
$$
Gilt
$$
\sum_{n=1}^\infty P(A_n) < \infty,
$$
so folgt
$$
P\bigl(\limsup_{n\to\infty} A_n\bigr) \;=\; 0.
$$
Das heißt die Ereignisse $A_n$ treten mit Wahrscheinlichkeit 1 nur endlich oft auf. Unter der zusätzlichen Annahme, dass die Ereignisse $A_n$ unabhängig sind, und gilt außerdem
$$\sum_{n=1}^\infty P(A_n) = \infty,$$
dann folgt
$$
P\bigl(\limsup_{n\to\infty} A_n\bigr) \;=\; 1.
$$
Also treten die $A_n$ mit Wahrscheinlichkeit 1 unendlich oft auf. Wird hier nicht bewiesen.
∎

**Bemerkung**
Analog ist
$$
\liminf_{n\to\infty} A_n \;=\; \{\omega\in\Omega:\ \omega\in A_n\text{ für nur endlich viele }n\}.
$$
Und es gilt
$$P(\limsup_{n \to \infty} A_n) = 1 \iff P(\liminf_{n \to \infty} A_n) = 0,$$
$$P(\limsup_{n \to \infty} A_n) = 0 \iff P(\liminf_{n \to \infty} A_n) = 1.$$
∎
