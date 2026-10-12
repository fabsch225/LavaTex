---
title: |
  Assoziativität des Gruppengesetzes auf elliptischen Kurven:\
  Ein geometrischer und ein computergestützter Beweis
author: Fabian Schuller
date: 07.08.2025
fontsize: 11pt
margin: 2.7cm
proofname: Beweis
preamble: |-
  \usepackage[ngerman]{babel}
  \usepackage{amsmath, amsthm, amssymb}
  \usepackage{enumitem}
  \usepackage{wrapfig}
  \usepackage{listings}
  \usepackage{xcolor}
  \usepackage{xurl}

  \definecolor{codegray}{gray}{0.95}
  \definecolor{commentgreen}{rgb}{0,0.6,0}
  \definecolor{keywordblue}{rgb}{0,0,1}
  \lstdefinestyle{pythonstyle}{
      backgroundcolor=\color{codegray},
      commentstyle=\color{commentgreen},
      keywordstyle=\color{keywordblue}\bfseries,
      stringstyle=\color{red},
      basicstyle=\ttfamily\footnotesize,
      breaklines=true,
      frame=single,
      language=Python,
      showstringspaces=false,
      tabsize=4
  }
  \lstset{style=pythonstyle}

  \newtheoremstyle{mystyle}
    {10pt}{10pt}{\normalfont}{}{\bfseries}{.}{ }
    {\thmname{#1}\thmnumber{ #2}\bfseries \thmnote{ (#3)}}
  \theoremstyle{mystyle}
theorems:
  - id: theorem
    name: Satz
    counter: section
  - id: lemma
    name: Lemma
    like: theorem
  - id: kor
    name: Korollar
    like: theorem
---

Sei $K$ ein Körper mit $\operatorname{char}K \neq 2,3$ und
$E/K : Y^2Z = X^3 + AXZ^2 + BZ^3$ eine glatte projektive ebene Kubik
(kurze Weierstrassform) mit neutralem Element $O = [0:1:0]$. Für
$P, Q \in E$ mit $P \neq Q$ bezeichne $\overline{PQ}$ die Verbindungsgerade,
für $P=Q$ die Tangente in $P$. Man schreibt
$P * Q$ für den dritten Schnittpunkt von $\overline{PQ}$ mit $E$ und definiert
$P + Q := O * (P*Q)$. Kommutativität ist unmittelbar aus $\overline{PQ}=\overline{QP}$
klar. Hier wird die Assoziativität dieser Verknüpfung bewiesen, zunächst
synthetisch über den Neunpunktesatz, danach algorithmisch mittels
Idealtheorie und SageMath.

Dies ist eine mit Claude Code umgeschriebene Version einer Seminar-Ausarbeitung über Kryptographie mit elliptischen Kurven.

# Geometrischer Beweis

Da die Abgeschlossenheit von $E(K)$ bereits gezeigt ist, darf $K$ für den
Beweis o. B. d. A. algebraisch abgeschlossen angenommen werden. Beide
Beweise stützen sich auf folgende, hier zitierte Resultate.

**Satz** (Bézout, vereinfacht, &[[Stoll20]], Satz 4.3) {#thm-bezout}
Sei $C : F(X,Y,Z)=0$ eine ebene projektive Kurve vom Grad $d$ über $K$ und
$G : aX+bY+cZ=0$ eine projektive Gerade, die kein Faktor von $C$ ist. Dann
gilt, mit Schnittzahlen $i(G,C,P)$,
$$
\sum_{P \in C(\bar K) \cap G(\bar K)} i(G,C,P) = d.
$$
Insbesondere schneidet jede Gerade die Kubik $E$ in genau drei Punkten
(mit Multiplizität), sodass $P*Q$ wohldefiniert ist.
∎

**Satz** (Surjektivität nicht-konstanter Morphismen, &[[Hulek12]], Satz 6.34) {#thm-surj}
Ist $f : C \to C'$ ein nicht-konstanter Morphismus zwischen glatten
projektiven Kurven über $K$, so ist $f$ surjektiv.
∎

Dass die Gruppenverknüpfung, und damit auch jede der Abbildungen
$Q \mapsto P*Q$, $Q \mapsto P+Q$ für festes $P \in E$, ein Morphismus
$E \to E$ ist, wird hier als Tatsache aus &[[Stoll20]] (Kap. 6)
vorausgesetzt.

**Lemma** (Neunpunktesatz, &[[Stoll20]], Satz 9.2) {#lem-nine}
Seien $L_1,L_2,L_3,L_1',L_2',L_3' \in K[X,Y,Z]$ Linearformen, deren zugehörige
Geraden $G_i = V(L_i)$, $G_j' = V(L_j')$ neun paarweise verschiedene
Schnittpunkte $P_{ij} := G_i \cap G_j'$ besitzen. Ist $C = V(F)$ eine ebene
Kubik durch alle $P_{ij}$ mit $(i,j) \neq (3,3)$, so gilt bereits $P_{33} \in C$.

**Beweis**
Der Vektorraum $K[X,Y,Z]_3$ der Kubiken hat Dimension $\binom{5}{2}=10$; jede
Bedingung $F(P_{ij})=0$ ist linear in den Koeffizienten von $F$, also hat der
Unterraum $V$ der Kubiken durch die acht Punkte $P_{ij}$, $(i,j)\neq(3,3)$,
Dimension $\geq 2$. Die Produkte $L := L_1L_2L_3$ und $L' := L_1'L_2'L_3'$
liegen in $V$ und sind wegen der Punktverschiedenheit linear unabhängig.

Angenommen $\dim V \geq 3$. Wähle $A \in G_1$ und $B \notin G_1\cup G_2\cup G_3$
mit $A, B \notin \{P_{ij}\}$. Da das Verschwinden in zwei weiteren Punkten
höchstens zwei weitere lineare Bedingungen liefert, existiert
$0 \neq F \in V$ mit $F(A)=F(B)=0$. Die Gerade $G_1$ trifft $V(F)$ in den vier
Punkten $P_{11},P_{12},P_{13},A$; nach Satz [#thm-bezout] folgt $G_1 \subseteq V(F)$, also
$L_1 \mid F$, etwa $F = L_1 F'$ mit $\deg F' = 2$. Da $L_1$ in $P_{21},P_{22},P_{23}$
nicht verschwindet, verschwindet $F'$ dort, also analog $G_2 \subseteq V(F')$
und $F' = L_2 F''$ mit $\deg F'' = 1$. Schließlich verschwindet $F''$ in den
zwei verschiedenen Punkten $P_{31},P_{32} \in G_3$, also $F'' = c L_3$ für ein
$c \in K^\times$ (oder $F''\equiv0$, dann $F=0$, Widerspruch). Damit
$F = cL$, im Widerspruch zu $L(B) \neq 0 = F(B)$. Also $\dim V = 2$ und
$V = \langle L, L' \rangle$.

Für eine Kubik $C=V(F)$ durch die acht Punkte gilt somit $F = cL + c'L'$ mit
$c,c' \in K$. Wegen $P_{33} \in G_3 \cap G_3'$ ist $L_3(P_{33})=L_3'(P_{33})=0$,
also $L(P_{33}) = L'(P_{33}) = 0$ und damit $F(P_{33})=0$.
∎

**Satz** (Assoziativität, &[[Stoll20]], Satz 9.1) {#thm-assoc}
Für alle $P,Q,R \in E$ gilt $(P+Q)+R = P+(Q+R)$.

**Beweis**
*Schritt 1 (generischer Fall).* Seien $P,Q,R \in E$ so gewählt, dass die
neun Punkte
$$
O,\; P,\; Q,\; R,\; P*Q,\; Q*R,\; P+Q,\; Q+R,\; Z
$$
paarweise verschieden sind, wobei $Z$ unten definiert wird. Betrachte das
Geradengitter
$$
\begin{array}{lll}
G_1 = \overline{PQ}, & G_2 = \overline{O,(Q*R)}, & G_3 = \overline{(P+Q)R},\\[2pt]
G_1' = \overline{O,(P*Q)}, & G_2' = \overline{QR}, & G_3' = \overline{(Q+R)P}.
\end{array}
$$
Die Schnittpunkte $G_i \cap G_j'$ sind der Reihe nach
$$
\begin{array}{lll}
G_1\cap G_1' = P*Q, & G_1\cap G_2' = Q, & G_1\cap G_3' = P,\\
G_2\cap G_1' = O, & G_2\cap G_2' = Q*R, & G_2\cap G_3' = Q+R,\\
G_3\cap G_1' = P+Q, & G_3\cap G_2' = R, & G_3\cap G_3' =: Z.
\end{array}
$$
Die ersten acht Punkte liegen nach Konstruktion auf $E$. Nach Lemma
[#lem-nine] (mit $C=E$) liegt daher auch $Z$ auf $E$. Da $Z \in G_3$ und
$G_3$ die Kurve $E$ nach Konstruktion genau in $\{P+Q,\,R,\,Z_1\}$ schneidet,
wobei $Z_1 := (P+Q)*R$ der dritte Schnittpunkt ist, folgt aus der
Punktverschiedenheit $Z = Z_1$. Analog folgt aus $Z \in G_3'$, dass
$Z = Z_2 := P*(Q+R)$. Also $Z_1 = Z_2$, und damit
$$
(P+Q)+R = O*Z_1 = O*Z_2 = P+(Q+R).
$$

*Schritt 2 (Ausnahmefälle).* Sei $\psi(Q) := \big((P+Q)+R\big) - \big(P+(Q+R)\big)$,
für feste $P,R \in E \setminus \{O\}$, $P \neq R$ (der Fall $P=R$ bzw.
$P=O$ oder $R=O$ folgt aus der Kommutativität bzw. der Neutralität von $O$).
Als Verkettung und Differenz von Morphismen ist $\psi : E \to E$ selbst ein
Morphismus. Die Bedingung, dass die neun oben genannten Punkte
*nicht* paarweise verschieden sind, legt für festes $P,R$ eine der
endlich vielen Gleichungen $Q=P$, $Q=R$, $Q=O$, $Q*R=P$, $P*Q=R$ usw. fest;
die Menge $S \subset E$ der Ausnahme-$Q$ ist also endlich. Für jedes
$Q \in E \setminus S$ gilt nach Schritt 1 $\psi(Q) = O$.

Wäre $\psi$ nicht konstant, so wäre $\psi$ nach Satz [#thm-surj]
surjektiv, also $\psi(E) = E$. Da $K$ algebraisch abgeschlossen, insbesondere
unendlich ist, ist auch $E(K)$ unendlich, während
$\psi(E) \subseteq \{O\} \cup \psi(S)$ endlich ist, ein Widerspruch. Also ist
$\psi$ konstant, und wegen $\psi(Q)=O$ für ein (tatsächlich fast jedes)
$Q \in E$ folgt $\psi \equiv O$ auf ganz $E$. Das bedeutet
$(P+Q)+R = P+(Q+R)$ für alle $Q \in E$, und da $P,R$ beliebig waren, für
alle $P,Q,R \in E$.
∎

# Computergestützter Beweis mit SageMath

Der zweite Zugang verifiziert dieselbe Identität algebraisch, ohne
geometrische Argumente, und ist der in der Praxis (u. a. in der
*Explicit Formulas Database* &[[EFD]]) verwendete Ansatz, um
(ggf. optimierte) Additionsformeln zu verifizieren.

Sei $I := \langle P_y^2-P_x^3-AP_x-B,\; Q_y^2-Q_x^3-AQ_x-B,\; R_y^2-R_x^3-AR_x-B \rangle \triangleleft K[P_x,P_y,Q_x,Q_y,R_x,R_y,A,B]$ das Ideal, das die drei
Kopien der Weierstrassrelation erzeugt. Nach &[[cox2015ideals]] (Kap. 5, §2, Satz 7)
gilt für den Koordinatenring der (affinen) Kurve
$$
K[X,Y,A,B]/I(E) \;\cong\; K[E],
$$
d. h. zwei Polynome in $P_x,P_y,Q_x,Q_y,R_x,R_y,A,B$ repräsentieren
*dieselbe* Funktion auf $E\times E\times E$ genau dann, wenn ihre
Differenz in $I$ liegt, algorithmisch also genau dann, wenn sie im
Quotientenring $K[\ldots]/I$ übereinstimmen &[[friedl2017elementaryproofgrouplaw]].
Da die Additionsformel $x_3 = m^2-x_1-x_2,\ y_3=m(x_1-x_3)-y_1$ mit
$m=(y_2-y_1)/(x_2-x_1)$ nur rationale, keine polynomialen Funktionen liefert,
wird Gleichheit von Brüchen über
$$
\frac{a}{b} = \frac{c}{d} \;:\Longleftrightarrow\; ad - bc = 0 \quad \text{in } K[\ldots]/I
$$
getestet. Die folgende Implementierung (nach &[[sutherland2021lecture2]])
prüft so $(P+Q)+R = P+(Q+R)$ simultan für alle kurzen Weierstrasskurven
$Y^2=X^3+AX+B$ über $\mathbb Z$, d. h. mit $A,B$ als weiteren Unbestimmten:

```python
RR.<Px,Py,Qx,Qy,Rx,Ry,A,B> = PolynomialRing(ZZ,8)
P=(Px,Py); Q=(Qx,Qy); R=(Rx,Ry)
I=RR.ideal(Py^2-Px^3-A*Px-B, Qy^2-Qx^3-A*Qx-B, Ry^2-Rx^3-A*Rx-B)
SS=RR.quotient(I)

def add(P,Q):
    x1=P[0]; y1=P[1]; x2=Q[0]; y2=Q[1];
    m = (y2-y1)/(x2-x1)
    x3 = m^2-x1-x2
    y3 = m*(x1-x3)-y1
    return (x3,y3)

def reduced_fractions_equal(p, q):
    return SS(p.numerator()*q.denominator()-p.denominator()*q.numerator()) == 0

def equal(P,Q):
    return reduced_fractions_equal(P[0],Q[0]) and reduced_fractions_equal(P[1],Q[1])

print("Confirmed associativity:", equal(add(add(P,Q),R),add(P,add(Q,R))))
```

Sage reduziert dabei Polynome mit über 500 Koeffizienten modulo $I$ und
bestätigt beide Gleichheiten. Der Ansatz deckt nur den generischen Fall
$P\neq Q\neq R$, $P,Q,R\neq O$ ab (die Additionsformel selbst ist an den
Ausnahmestellen nicht definiert); Sonderfälle sind gesondert zu behandeln.
Über einem konkreten endlichen Körper, etwa für Curve25519, ersetzt man
`ZZ` durch `GF(2^255 - 19)` &[[kleppmann2022curve25519]].
