# Fazit

Die Arbeit spannt den Bogen von elementaren stochastischen Prozessen über das Binomialmodell und die diskrete Brownsche
Bewegung bis zur geometrischen Brownschen Bewegung als kontinuierlichem Grenzfall. Zentrale stochastische Begriffe wie
Filtration, bedingter Erwartungswert und Martingal werden eingeführt und in diskreten Wahrscheinlichkeitsräumen verankert.
Durch Grenzwertbetrachtungen werden die Konzepte dann auf kontinuierliche Wahrscheinlichkeitsräume übertragen. Es wird gezeigt, dass im Grenzübergang $\Delta t \to 0$ die Kursdynamik durch
$S_T = S_0 \exp\!\big((\mu - \tfrac12\sigma^2)T + \sigma W_T\big)$
beschrieben wird, sodass $\log S_T$ normal- und $S_T$ log-normalverteilt ist.

Im erweiterten Binomialmodell wird der diskontierte Aktienkurs als Martingal unter einem risikoneutralen Maß konstruiert und die Optionsbewertung
via Rückwärtsinduktion hergeleitet; im Grenzfall führt dies zum Black–Scholes-Modell.

Empirisch werden die Parameter aus
Log-Renditen geschätzt, daraus Konfidenzintervalle und -bänder abgeleitet und mittels Monte-Carlo-Simulation validiert.
Ein Backtest auf DAX-Daten zeigt eine hohe Überdeckungsrate im 50%-Band und nachvollziehbare Fehlermaße (MSE, MAPE, NRMSE),
was die Praxistauglichkeit trotz der Modellvereinfachungen unterstreicht.

Letztlich wird gezeigt, wie die diskrete Modellierung durch Grenzübergang zur stochastischen Differentialgleichung führt, deren Lösung die
geometrische Brownsche Bewegung ist. Die Konstruktion des Itô-Integrals wird skizziert und die
heuristische Schreibweise $dS_t = a(S_t,t)\,dt + b(S_t,t)\,dW_t$ mathematisch präzisiert.

Darauf aufbauend werden alternative Modelle wie lokale und stochastische Volatilität und Sprung-Diffusions-Modelle vorgestellt, die realistische Markteigenschaften wie Volatilitäts-Clustering oder Sprünge abbilden können.
Am Beispiel des CEV-Modells wird die Parameterschätzung aus diskreten Daten mittels (Quasi-)Maximum-Likelihood
erläutert und in R implementiert. Ein Vergleich von DAX, Lufthansa und dem Wechselkurs der türkischen Lira zeigt, dass GBM und CEV meist ähnliche Ergebnisse liefern, das CEV-Modell jedoch insbesondere bei ausgeprägter Korrelation zwischen Preis und Volatilität deutliche Vorteile bietet. Die Ergebnisse unterstreichen die Bedeutung der
Modellauswahl und Kalibrierung für die praktische Anwendung in der Finanzmathematik.

#### Methodik

Methodisch verbindet die Arbeit diskrete Grenzwert- und Martingalargumente mit
reproduzierbarer Empirie in R. Zudem spielt die Monte-Carlo-Simulation eine zentrale Rolle als universelles
Werkzeug zur Approximation risikoneutraler Erwartungswerte,
sowohl für Endwert-Auszahlungen als auch für pfadabhängige Optionen. Für die geometrische Brownsche
Bewegung werden Endwerte unter dem risikoneutralen Maß exakt berechnet; bei Pfadabhängigkeiten wird zeitlich diskretisiert.
Die beobachtete Annäherung der empirischen Quantile an die analytischen Lognormal-Quantile mit wachsender Pfadzahl bestätigt
Konsistenz und Korrektheit der Implementierung; der Vergleich analytischer Konfidenzbänder mit Simulationsquantilen dient als robuster Plausibilitätscheck.
Als Beispiel dient ein Datensatz von DAX-Renditen.

Die geometrische Brownsche Bewegung wird über Logarithmierung, Taylor-Entwicklung bis Ordnung zwei sowie Gesetz der großen Zahlen und
zentralen Grenzwertsatz hergeleitet. Zudem kommen die Sätze von Cramér-Wold und Pratt zum Einsatz,
genauso wie das Reihenkriterium für fast sichere Konvergenz, welches
ein Korollar zum Lemma von Borel-Cantelli ist (vgl. &[[Henze-Stochastik]]). Insbesondere wird das Kalkül der stochastischen Differentialgleichung zunächst vermieden.

Einen Einblick in die Thematik bietet Kapitel 8: die Methodik wird um die numerische Simulation und Parameterschätzung stochastischer Differentialgleichungen (SDEs) mittels Euler-Verfahren und Maximum-Likelihood-Ansätzen erweitert.
Die Implementierung alternativer Modelle werden am Beispiel des CEV-Modell in R durchgeführt.
Dabei kamen die Pakete `Sim.DiffProc` und das numerische Optimierungspaket `nloptr` zum Einsatz.
Anschließend wird das CEV-Modell mit der GBM verglichen, inklusive Backtests mit empirischen Gütemaßen.

## Abbildungen, Quellcode und Tabellen

Alle Abbildungen, Quellcode-Ausschnitte und Tabellen wurden vom Autor mit der Programmiersprache R erstellt. Der Quellcode zu allen Abbildungen, Tabellen und Code-Ausschnitten ist online &[[Schuller-Github]] verfügbar.
