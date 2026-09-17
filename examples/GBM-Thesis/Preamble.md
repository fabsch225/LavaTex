\usepackage{amsmath, amssymb, amsthm}
\usepackage[ngerman]{babel}
\usepackage{tikz}
\usetikzlibrary{arrows.meta, positioning}
\usepackage[hidelinks]{hyperref}
\usepackage{booktabs}
\usepackage{listings}
\usepackage{float}

\newtheoremstyle{gbmstyle}
  {10pt}{10pt}{\normalfont}{}{\bfseries}{.}{15pt}
  {\thmname{#1}\thmnumber{ #2}\bfseries \thmnote{ (#3)}}
\theoremstyle{gbmstyle}

\lstdefinelanguage{R}{
  keywords={if,else,repeat,while,function,for,in,next,break,TRUE,FALSE,NULL,NA,NaN,Inf},
  otherkeywords={!,!=,~,\*,\&,\%/\%,\%*\%,\%>\%,<-,<<-,->,->>,=,<=,>=,::,:::},
  sensitive=true,
  morecomment=[l]{\#},
  morestring=[b]"
}
\lstdefinestyle{r-minimal}{
  language=R,
  basicstyle=\ttfamily\small,
  numbers=left,
  numberstyle=\tiny,
  numbersep=6pt,
  stepnumber=1,
  showstringspaces=false,
  breaklines=true,
  keepspaces=true,
  columns=fullflexible,
  frame=none,
  xleftmargin=2em,
  framexleftmargin=1.5em,
  literate={ä}{{\"a}}1 {ö}{{\"o}}1 {ü}{{\"u}}1
           {Ä}{{\"A}}1 {Ö}{{\"O}}1 {Ü}{{\"U}}1 {ß}{{\ss}}1
}
\lstset{style=r-minimal}
