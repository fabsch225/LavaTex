---
title: Die Weierstraßsche $\varphi$-Funktion
author: Fabian Schuller
date: \today
fontsize: 12pt
margin: 1in
linestretch: 1.25
refname: Referenzen
proofname: Beweis
autoEqnLabels: true
preamble: "[[preamble]]"
theorems: "[[theorems]]"
macros: "[[macros]]"
---

# Existenz der Weierstraßschen $\varphi$-Funktion

**Definition** (Gitter; &[[Koecher-Krieg]] S. 14)
Eine Teilmenge $\Omega \subset \mathbb C$ heißt Gitter, wenn es reell-linear-unabhängige $\omega _1, \omega _2 \in \mathbb C$ gibt, so dass
$$
\Omega = \omega _1 \mathbb Z + \omega _2 \mathbb Z.
$$
∎

Im Folgenden sei stets $\Omega$ ein Gitter mit Basis $(\omega _1, \omega _2)$. Ziel ist es, eine meromorphe Funktion $\varphi$ zu konstruieren, die entlang des Gitters periodisch ist, d. h. für $\omega \in \Omega$ und $z \in \mathbb C$ gilt $\varphi(z+ \omega )=\varphi(z)$.

**Definition** (elliptische Funktionen)
Solche Funktionen nennt man elliptisch bezüglich $\Omega$.
∎

**Theorem** (Weierstraßsche $\varphi$-Funktion; &[[Koecher-Krieg]] S.35) {#thm-weier}
Die Reihe
$$
\varphi(z) := z^{-2} + \sum_{\omega \in \Omega} \left(  \frac{1}{(z-\omega )^2} - \frac{1}{\omega ^2} \right)
$$
konvergiert auf $\mathbb C \setminus \Omega$ lokal absolut gleichmäßig. Man nennt $\varphi : \mathbb C \to \mathbb C$ die Weierstraßsche $\varphi$-Funktion.
∎

Für den Beweis wird die Konvergenz von Eisensteinreihen verwendet. Da es sich um eine Summation aller Gitterpunkte handelt, erhält man mit einem Analogon zum Riemannschen Umordnungssatz die gewünschte doppelte Periodizität.

**Theorem** (Umordnungssatz; &[[Remmert-Schumacher]] S.26) {#thm-umord}
Sei $(a_n)_{n \in \mathbb N} \subset \mathbb C$ eine Folge. Ist $\sum_{n=1}^\infty a_n$ absolut konvergent, so konvergiert auch jede Umordnung dieser Reihe, d. h. für jede Bijektion $k : \mathbb N \to \mathbb N$ konvergiert auch $\sum_{n=1}^\infty a_{k(n)}$ absolut.
`\ohnebew`{=latex}
∎

**Definition** (Periodenparralelogramm, Grundmasche; &[[Koecher-Krieg]] S. 19f)
Man definiert das Periodenparralelogramm (bezüglich $(\omega _1, \omega _2)$) mit Basispunkt $u \in \mathbb C$ durch
$$
\pa(u, \omega _1, \omega _2) := \left\lbrace u + \alpha \omega _1 + \beta \omega _2 : \alpha, \beta  \in [0, 1) \right\rbrace
$$
und nennt $\pa(0, \omega_1, \omega _2) =: \pa(\omega_1, \omega _2)$ Grundmasche von $\Omega$.
∎

**Definition** (Gittervolumen; &[[Koecher-Krieg]] S. 20)
Man definiert $\vol \Omega := \vol \left ( \pa(u, \omega_1, \omega _2) \right )$ welches unabhängig von der Wahl von $u$ und der Wahl der Basis `\basis`{=latex} ist.
`\ohnebew`{=latex}
∎

**Lemma** (&[[Koecher-Krieg]] S.21f) {#lem-gitter-invariant}
Man nennt
$$
\delta := \delta (\omega _1, \omega _2) := \sup \left\{ |z-w| : z, w \in \pa(\omega _1, \omega _2)  \right\}
$$
den Durchmesser der Grundmasche von $\Omega$. Für $\rho > 0$ sei $A_\rho(\Omega)$ die Anzahl von Gitterpunkten in der abgeschlossenen Kreisscheibe um  $0$ mit Radius $\rho$, d. h.
$$
A_\rho(\Omega) = \# \{ \omega  \in \Omega : |\omega | \le \rho \} .
$$
Dann gilt für alle $\rho > \delta$
$$
\frac{\pi }{\vol \Omega} (\rho - \delta )^2 \le A_\rho(\Omega) \le \frac{\pi }{\vol \Omega} (\rho + \delta )^2 .
$$

**Beweis**
Betrachte
$$
B_\rho := \{ z \in \mathbb C : |z| \le \rho \} \quad \mathrm{und} \quad M_\rho := \bigcup_{u \in \Omega : |u| \le \rho} \pa(u, \omega _1,\omega _2).
$$
Da $\delta$ die maximale Ausbreitung einer Masche ist, gilt
$$
B_{\rho - \delta } \subset M_\rho \subset B_{\rho + \delta }.
$$
Geht man zum Flächenmaß dieser Mengen über erhält man
$$
\pi (\rho - \delta )^2 \le \vol (\Omega) A_\rho(\Omega) \le \pi (\rho + \delta )^2
$$
wegen $\vol_2 (B_r) = \pi r^2$ und (da die Parallelogramme an Gitterpunkten disjunkt sind)
$$
\vol_2(M_\rho) = \sum_{u \in \Omega : |u| \le \rho} \vol_2 \left( \pa(u, \omega _1, \omega _2) \right) = \vol \Omega \cdot A_\rho(\Omega).
$$
Teilt man die Gleichung durch $\vol(\Omega)$ erhält man die Behauptung.
∎
∎

**Definition und Lemma** (Eisensteinreihen; &[[Koecher-Krieg]] S.22ff) {#thm-eisen}
Die Reihe
$$
\sum_{0 \ne \omega  \in \Omega} |\omega|^{-\alpha}
$$
konvergiert genau dann wenn $\alpha > 2$.
$$
G_k := G_k(\Omega) := \sum_{0 \ne \omega  \in \Omega} \omega^{-k}
$$
heißt $k$-te Eisensteinreihe (von $\Omega$).

**Beweis**
Um das vorige Lemma anwenden zu können, wird die Reihe
$$
\sum_{0 \ne \omega \in \Omega : |\omega| > \delta}  |\omega|^{-\alpha}
$$
betrachtet. Dies ist keine Einschränkung, da durch $|\omega| > \delta$ nur endlich viele Summanden wegfallen. Nun werden die Summanden in die Annuli $B_{n+1} \setminus B_n$, $n \in \mathbb N$ gruppiert. Eine Gruppierung kann nun mit dem Produkt aus Anzahl von Gitterpunkten im Annulus $A_{n+1}(\Omega) - A_n(\Omega)$ und dem inneren oder äußeren Radius $n$ oder $n+1$ abgeschätzt werden. Zwecks Abschätzung betrachten wir jedoch Annuli der Breite $\varepsilon > 2\delta$.

```{=latex}
\newcommand{\sumoverannuli}{\sum_{\omega \in \Omega \cap B_{\varepsilon (n+1)} \setminus B_{\varepsilon n}}}
\newcommand{\annulicount}{ \left( A_{\varepsilon (n+1)}(\Omega) - A_{\varepsilon n}(\Omega) \right) }
```

$$
\sum_{n>\delta }^\infty \sumoverannuli  |\omega|^{-\alpha} \le \sum_{n=0}^\infty n^{-\alpha } \annulicount
$$
Aus Lemma [#lem-gitter-invariant] (und $n > \delta$) folgt
$$
\annulicount \le \frac{\pi }{\vol \Omega} \left(  (\varepsilon (n+1) + \delta )^2 - (\varepsilon n - \delta )^2  \right) \le c_1 n
$$
Für $\alpha > 2$ gilt
$$
\sum_{n>\delta }^\infty  \sumoverannuli   |\omega|^{-\alpha} \le c_1 \sum_{n=0}^\infty n^{-\alpha +1} = C < \infty
$$
mit dem Integralkriterium für Reihen. Andererseits ist
$$
\sum_{n>\delta }^\infty  \sumoverannuli   |\omega|^{-\alpha} \ge \sum_{n=0}^\infty {n+1}^{-\alpha }  \annulicount
$$
und analog
$$
\begin{align}
     \annulicount &\ge \tilde c_2 \left(  (\varepsilon (n +1) - \delta )^2 - (\varepsilon n +  \delta )^2  \right) \\
&= \tilde c_2 (2n \varepsilon (\varepsilon  - \delta ) + \varepsilon^2 - 2\varepsilon \delta) \ge c_2 n
\end{align}
$$

und man erhält Divergenz für $\alpha \le 2$ ebenfalls mit dem Integralkriterium.
Es wurde gezeigt, dass eine Umordnung der Reihe
$$
\sum_{0 \ne \omega \in \Omega : |\omega| > \delta}  \omega^{-\alpha}
$$
(nicht) absolut konvergiert, und nach dem Umordnungssatz [#thm-umord] also auch die Reihe selbst.
∎
∎

*Beweis von Theorem [#thm-weier].* Sei $K \subseteq \mathbb C \setminus \Omega$ kompakt; wähle $R > 0$ so dass $K \subset B_R(0)\subset \mathbb C$. Da $|\omega | < R+1$ für nur endlich viele $\omega \in \Omega$ zutrifft, kann man ohne Einschränkung annehmen dass $|\omega | \ge R+1$. Dann ist

$$
\begin{align}
    \left | \frac{1}{(z-\omega )^2} - \frac{1}{\omega ^2}   \right | = \left | \frac{2z\omega - z^2 }{\omega ^2 (z-\omega )^2}   \right | = \left | \frac{2 - \frac{z}{\omega } }{(1-\frac{z}{\omega } )^2}   \right | \cdot \frac{|z|}{|\omega |^3} \le \frac{3}{(1 - \frac{R}{R+1} )^2} \cdot \frac{R}{|\omega |^3}
\end{align}
$$

Nun folgt die Konvergenz der $\varphi$-Funktion aus der Konvergenz der Eisensteinreihe $G_3$.`\qed`{=latex}

**Lemma** (&[[Koecher-Krieg]], S. 23) {#lem-ungerade-eisenstein}
Es gilt $G_k(\Omega)=0$ für alle ungeraden $k \ge 3$.

**Beweis**
Da für jedes $\omega \in \Omega$ auch $-\omega \in \Omega$, gilt wegen des Umordnungssatzes [#thm-umord]
$$
G_k(\Omega) = (-1)^k \cdot G_k(\Omega).
$$
Somit folgt die Behauptung.
∎
∎

**Theorem** (Laurent-Entwicklung der Weierstraßschen $\varphi$-Funktion; &[[Koecher-Krieg]] S.37)
Setzt man $\gamma := \gamma (\Omega) := \operatorname{min} \{ |\omega | : 0 \ne \omega \in \Omega \}$ so gilt für alle $z \in \mathbb C$ mit $0 < |z| < \gamma$
$$
\varphi (z) = z^{-2} + \sum_{n=2}^{\infty} (2n-1) G_{2n} \cdot z^{2n-2},
$$
wobei $G_k$ die Eisenstein-Reihe aus Definition [#thm-eisen] ist.

**Beweis**
Ableiten der geometrischen Reihe ergibt
$$
\frac{1}{(1-t)^2} = \frac{d}{dt} \left ( \frac{1}{1-t}  \right ) = \sum_{m=1}^{\infty} m t^{m-1}
$$
für $|t|<1$, und somit gilt für $\omega \ne 0$ und $|z|<\gamma$
$$
\frac{1}{(1-\omega)^2} - \frac{1}{\omega^2} =  \frac{1}{\omega^2} \left( \frac{1}{(1-z/\omega)^2} - 1 \right) =  \frac{1}{\omega^2} \left( \sum_{m=1}^{\infty} m \frac{z^{m-1}}{\omega^{m-1}} + 1 \right) = \sum_{m=2}^{\infty} m  \frac{z^{m-1}}{\omega^{m+1}}
$$
und daher
$$
\varphi (z) = z^{-2} + \sum_{0 \ne \omega \in \Omega}^{} \left( \sum_{m=2}^{\infty} m  \frac{z^{m-1}}{\omega^{m+1}}   \right) , 0 < |z|<\gamma
$$ {#eq:doppel}
Wegen
$$
\left| m  \frac{z^{m-1}}{\omega^{m+1}}  \right| \le \gamma m \left( \frac{z}{\gamma}  \right)^{m-1} \cdot |\omega|^{-3}
$$
kann man die Konvergenz der Eisensteinreihen ([#thm-eisen]) nutzen und erhält absolute Konvergenz der Doppelreihe in [@eq:doppel]. (Absolute Konvergenz in $m$ wieder mit der Ableitung der geometrischen Reihe.) Mit dem Umordnungssatz [#thm-umord] erhält man
$$
\varphi (z) = z^{-2} + \sum_{m=2}^{\infty} m z^{m-2} G_{m+1} , 0 < |z|<\gamma.
$$
Mit Lemma [#lem-ungerade-eisenstein] verschwinden die Summanden mit  $2 \mid m$, und somit folgt die Behauptung.
∎
∎

# Differenzialgleichung für die Weierstraßsche $\varphi$-Funktion

Wir untersuchen die Weierstraßsche $\varphi$-Funktion mit den Liouvilleschen Sätzen.

**Theorem** (Liouvillesche Sätze; &[[Koecher-Krieg]] S.25ff)
1. Ist $f \in \mathcal K(\Omega)$ holomorph, so ist $f$ bereits konstant. Hierbei bezeichnet $\mathcal K(\Omega)$ den Körper der meromorphen $\Omega$-periodischen Funktionen.
2. Ist $f \in \mathcal K(\Omega)$ und $P$ ein Periodenparrallelogramm, so gilt für die Summe der Residuen
   $$
   \sum_{c \in P} \operatorname{res}_c f = 0
   $$
3. Ist $f \in \mathcal K(\Omega)$ nicht konstant und $P$ ein Periodenparrallelogramm, so gilt für jedes $w \in \mathbb C$
   $$
   \sum_{c \in P}^{} \operatorname{ord}_c(f-w) = 0
   $$ {#eq:liouville-3}
4. Ist $f \in \mathcal K(\Omega)$ nicht die Nullfunktion und $P$ ein Periodenparrallelogramm, so gilt
   $$
   \sum_{c \in P}^{} ( \operatorname{ord}_c f ) \cdot c \in \Omega
   $$ {#eq:liouville-4}

`\ohnebew`{=latex}
∎

**Korollar** (der Laurent-Darstellung; &[[Koecher-Krieg]] S.28)
Die Weierstraßsche $\varphi$-Funktion ist eine gerade Funktion, d. h. $\varphi (-z)=\varphi (z)$, und für den ersten Laurent-Koeffizienten gilt $a_1=0$. Darüber hinaus ist $\varphi ^\prime$ eine ungerade (elliptische) Funktion, die genau an allen Gitterpunkten Pole dritter Ordnung hat.
∎

**Lemma** (&[[Koecher-Krieg]] S.28) {#lem-a}
Ist $\omega \in \Omega$ aber $\ohalbe \notin \Omega$, dann ist $\ohalbe$ eine einfache Nullstelle von $\varphi ^\prime$. Umgekehrt gilt  $z \notin \Omega, 2z \in \Omega$ für jedes $z \in \mathbb C$ mit $\varphi ^\prime(z)=0$.

**Beweis**
Da $\varphi ^\prime$ eine ungerade elliptische Funktion ist, gilt $\varphi ^\prime(z + \omega )=\varphi ^\prime(z) = - \varphi ^\prime(-z)$. Ist $\ohalbe$ kein Pol von $\varphi ^\prime$ und $\varphi$ (dies impliziert $\ohalbe \notin \Omega$) gilt
$$
\varphi ^\prime (\ohalbe) = - \varphi ^\prime(- \ohalbe + \omega) = - \varphi ^\prime(\ohalbe) = 0.
$$
Sei nun $z_0$ eine Nullstelle von $\varphi ^\prime$. Wegen der Elliptizität können wir ohne Einschränkung annehmen dass $z_0$ in der Grundmasche $\pa(\omega _1, \omega _2)$ liegt. Nun hat $\varphi ^\prime$ in der Grundmasche bereits die Nullstellen $\omega_1, \omega_2, \frac{\omega _1 + \omega _2}{2}$, und nach dem dritten Liouvilleschen Satz ([@eq:liouville-3]) ist die Anzahl (respektive Vielfachheit) der Nullstellen genau die Anzahl der Pole (respektive Vielfachheit). In der Grundmasche hat $\varphi ^\prime$ genau einen Pol der Ordnung drei (an der Stelle $0$), und somit kann es keine weiteren Nullstellen geben. Also hat $z_0$ die gewünschte Form.
∎
∎

**Lemma** (&[[Koecher-Krieg]] S.29) {#lem-b}
Sei $P$ ein Periodenparallelogramm. Für $q \in \mathbb C$ gilt
$$
\forall \omega \in \Omega \quad \text{mit} \quad  \ohalbe \notin \Omega : q \ne \varphi(\ohalbe)
$$ {#eq:ann-lemma-b}
genau dann, wenn es $u, v \in P$ mit $u \ne v$ aber $\varphi (u) = \varphi (v)=q$ gibt. In diesem Fall sind $u$ und $v$ eindeutig bestimmt.

**Beweis**
Nach dem dritten Liouvilleschen Satz ([@eq:liouville-3]) ist die Anzahl der $q$-Stellen genau zwei. Angenommen, es gibt nur ein $u \in P$ mit $\varphi (u)=q$. Dann hat die $q$-Stelle $u$ Vielfachheit zwei, und es ist $\varphi ^\prime(u)=0$. Nach Lemma [#lem-a] gilt
$$
u \in \left\lbrace  \frac{\omega_1}{2},  \frac{\omega_2}{2}, \frac{\omega_1 + \omega_2}{2}  \right\rbrace  \mod \Omega
$$
was einen Wiederspruch zur Annahme [@eq:ann-lemma-b] darstellt.
Also erhalten wir $u \ne v \in P$ mit $\varphi(u)=\varphi(v)=q$. Nach dem vierten Liouvilleschen Satz ([@eq:liouville-4]) ist $u+v \in \Omega$, da jeweils $\operatorname{ord} f=1$ gilt. Wegen dem dritten Liouvilleschen Satz kann es auch keine weiteren $q$-Stellen geben.
∎
∎

**Theorem** (Differenzialgleichung für die Weierstraßsche $\varphi$-Funktion; &[[Koecher-Krieg]] S.29f)
Für alle $z \in \mathbb C \setminus \Omega$ gilt
$$
(\varphi ^\prime)^2(z) = 4 (\varphi(z)-e_1) (\varphi(z)-e_2) (\varphi(z)-e_3)
$$
wobei $e_k := \varphi (\omega_k / 2)$, $k=1,2,3$ für eine Basis `\basis`{=latex} von $\Omega$ und $\omega_3 := \omega_1 + \omega_2$.

**Beweis**
Nach Lemma [#lem-b] hat $\varphi(z)-e_k$ eine (einzige) doppelte Nulltelle in der Grundmasche $P := \pa(\omega_1, \omega_2)$, nämlich $z_k = \omega_k / 2$. Somit besitzt auch $f(z) := 4 (\varphi(z)-e_1) (\varphi(z)-e_2) (\varphi(z)-e_3)$ doppelte Nullstellen genau bei den $z_k$. Dies gilt nach [#lem-a] auch für $(\varphi ^\prime)^2(z)$, und daher ist $g : z \mapsto (\varphi ^\prime)^2(z) / f(z)$ eine holomorphe (elliptische) Funktion. Der erste Satz von Liouville liefert, dass $g$ konstant ist.
In der Nähe von $z=0$ gilt wegen der Laurent-Entwicklung
$$
(\varphi ^\prime)^2(z) \approx f(z) \approx 4 (z^{-2})^3
$$
und somit erhält man $g=1$ bei $z \to 0$. Dies zeigt $(\varphi ^\prime)^2 = f$ wie behauptet.
∎
∎

**Theorem** (Test-Theorem) Es gilt XYZ.
`\ohnebew`{=latex}
∎
