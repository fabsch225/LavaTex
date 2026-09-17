# Die geometrische Brownsche Bewegung

Die geometrische Brownsche Bewegung ist eine Erweiterung der Brownschen Bewegung.
Sie eignet zur Modellierung von Aktienkursen, da sie im Gegensatz zur klassischen
Brownschen Bewegung stets positive Werte annimmt.

Das Binomialmodell beschreibt den Aktienkurs $S_t$ in diskreter Zeit: In jedem Zeitschritt ändert sich der Kurs multiplikativ um einen Zufallsfaktor. Es gilt
$$
S_{k+1} = S_k \,(1 + X_{k+1}), \qquad k = 0,1,\dots,n-1,
$$
für eine Zufallsvariable $X_{k+1}$ die die relative Kursänderung im Schritt $k+1$ repräsentiert. Um eine kontinuierliche Zeitentwicklung zu modellieren,
setzt man\footnote{Dies ist ein Schritt des Euler-Verfahren zur numerischen Lösung der
stochastischen Differentialgleichung der geometrischen Brownschen Bewegung. &[[Iacus]], S. 68.}
$$
X_{k+1} = \mu  \Delta t + \sigma \sqrt{\Delta t}\varepsilon_{k+1},
$$
mit $\mu$ als Erwartungswert der Rendite (oder auch Drift), $\sigma$ als Volatilität, und $\varepsilon_{k+1}$ unabhängig, identisch verteilten Zufallsvariablen mit Erwartungswert $0$ und Varianz $1$ (Modellannahme)\footnote{An dieser Stelle ist unwichtig, wie die $\varepsilon_{k+1}$ verteilt sind, es reicht, dass sie diese Momente besitzen.
Die Information über die Verteilung wird in einem Grenzübergang verloren gehen.}. Dann betrachtet man den Limes $\Delta t \to 0$. Im Folgenden wird eine explizite Formel für $S_t$ bewiesen.

**Satz** (explizite Formel)
Es gilt
$$S_T = S_0 \exp\!\Big( (\mu - \tfrac12 \sigma^2)T + \sigma W_T \Big),$$
wobei $W_T$ eine Brownsche Bewegung ist und $T=n \cdot \Delta t$.

**Beweis**
Man betrachtet den Logarithmus der $S_k$: Nach $n$ Schritten ist der Aktienkurs
$$
S_n = S_0 \prod_{j=1}^n (1 + X_j).
$$
Durch den Logarithmierung erhält man
$$
\log S_n = \log S_0 + \sum_{j=1}^n \log(1+X_j).
$$
{#eq:log_sn}
Als nächstes wird die Taylor-Entwicklung der Terme $\log(1+X_j)$ betrachtet. Die $k$-te Ableitung lautet
$$\log(1+x)^{(k)}=(-1)^{k+1} \frac{(k-1)!}{(1+x)^k}.$$
Setzt man diese in die Taylor-Formel ein ergibt sich
$$\log(1+x) = \sum_{k=0}^{\infty} \frac{(\log(1+\cdot)^{(k)})(0)}{k!}(x-0)^k= \sum_{k=1}^\infty(-1)^{k+1} \frac{x^k}{k}$$
Da $X_j \in O(\sqrt{\Delta t})$ ist, reicht die Taylor-Entwicklung bis zum quadratischen Term: Es gilt
$$
X_j^k = (\mu \Delta t + \sigma \sqrt{\Delta t} \varepsilon_j)^k.
$$
Durch den Binomischen Lehrsatz ergibt sich:
$$
X_j^k = \sum_{m=0}^k \binom{k}{m} (\mu \Delta t)^{k-m} (\sigma \sqrt{\Delta t} \varepsilon_j)^m.
$$
Die Terme enthalten Potenzen von $\Delta t$ in der Form $(\Delta t)^{(k-m) + m/2} = (\Delta t)^{k-m/2}$. Für $k \geq 3$ (und $m=0,\dots k$) ist $(\Delta t)^{k-m/2}$ von
höherer Ordnung als $\Delta t$ oder $\sqrt{\Delta t}$ und verschwindet daher im Grenzübergang $\Delta t \to 0$ bzw. $n \to \infty$. Der Grenzübergang
von diskreter zu kontinuierlicher Zeit führt eben dazu, dass $n$ und $\Delta t$ gleichzeitig gegen $\infty$ bzw. $0$ gehen, wobei $n \Delta t = T$ konstant bleibt.
Daher verschwinden in der Summe in Formel [#eq:log_sn] genau die Terme, in denen $\Delta t$ einen Exponenten größer $1$ hat.
$$
\log(1+X_j) \approx X_j - \tfrac12 X_j^2.
$$
Der quadratische Term wird nun ausmultipliziert und in der selben Weise abgeschätzt:
$$
\tfrac12 X_j^2 \approx \tfrac12 \sigma^2 \Delta t \,\varepsilon_j^2.
$$
Hier verschwinden die Terme $\mu (\Delta t)^2 \in O((\Delta t)^{2})$ und $2 \mu (\Delta t) \sigma \sqrt{\Delta t} \varepsilon_{k+1} \in O((\Delta t)^{3/2})$ wieder im Limes. Zwischenfazit:
$$
\begin{aligned}
\log S_n &\approx \log S_0 + \sum_{j=1}^n\left( \underbrace{\mu \Delta t + \sigma\sqrt{\Delta t} \varepsilon_j}_{X_j} - \underbrace{\frac{1}{2} \sigma^2 \Delta t \varepsilon_j}_{-\frac{1}{2} X_j^2} \right)
\\ &= \log S_0 + \mu T + \sigma\sqrt{\Delta t} \sum_{j=1}^{n} \varepsilon_j - \frac{1}{2} \sigma^2 \sum_{j=1}^{n} \Delta t \varepsilon_j^2
\end{aligned}
$$
Im Folgenden wird der Grenzübergang $n \longrightarrow \infty$ bzw. $\Delta t \longrightarrow 0$ durchgeführt.
Die erste Summe konvergiert nach dem Zentralen Grenzwertsatz (Verteilungskonvergenz):
$$
\sigma \sqrt{\Delta t} \sum_{j=1}^n \varepsilon_j = \sigma \frac{\sqrt{T}}{\sqrt{N}} \sum_{j=1}^n \varepsilon_j  \xrightarrow[n \to \infty]{\mathrm{d}} \xi \sim \mathcal N(0, \sigma^2 T),
$$
also gegen eine Zufallsvariable $\xi$ die normalverteilt ist, mit Varianz $\sigma^2 T$.  $\xi = \sigma W_T$ ist eine Lösung,
weil $W_T \sim \mathcal N(0, T)$ eine Brownsche Bewegung zur Zeit $T$ ist.
Da $E(\varepsilon_j)=0$ und $V(\varepsilon_j)=1$ und damit $E(\varepsilon_j^2) = 1$ gilt, folgt im Grenzübergang für die zweite Summe nach dem Gesetz der großen Zahlen
$$
\frac{1}{2} \sigma^2 \sum_{j=1}^{n} \Delta t \varepsilon_j^2  \xrightarrow[n \to \infty]{\mathrm{f.s.}} \tfrac12 \sigma^2 T.
$$
Damit ergibt sich im Grenzübergang $n \to \infty$:
$$
\log S_T \overset{d} = \log S_0 + \big(\mu - \tfrac12 \sigma^2\big)T + \sigma W_T.
$$
Exponentiell geschrieben erhält man die \textit{geometrische Brownsche Bewegung}:
$$
S_T \overset d = S_0 \exp\!\Big( (\mu - \tfrac12 \sigma^2)T + \sigma W_T \Big).
$$
∎
∎

**Definition** (logarithmische Normalverteilung)
Eine Zufallsvariable $X$ heißt log-Normalverteilt mit Varianz $\sigma^2$ und Erwartungswert $\mu$,
falls die Zufallsvariable $Y := \log(X)$ normalverteilt ist mit $Y \sim \mathcal N(\mu, \sigma^2)$.
$S_T$ ist somit log-normalverteilt:
$$\log S_T \overset{d} = \log S_0 + \big(\mu - \tfrac12 \sigma^2\big)T + \sigma W_T.$$
ergibt
$$\log S_T \sim N\left( \log S_0 + \left( \mu - \frac{1}{2} \sigma^2 \right)T , \sigma^2 T\right)$$
Erwartungswert und Varianz eines Kurses zum Zeitpunkt $T$ sind damit
$$E(S_T)=\log S_0 + (\mu - \tfrac12 \sigma^2)T, \quad V(S_T)=\sigma^2 T.$$
∎
