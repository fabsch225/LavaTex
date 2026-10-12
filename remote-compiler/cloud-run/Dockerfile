# Full TeX Live (so any preamble/package a note asks for just works), plus
# Tectonic (the plugin's alternative engine), plus
# the exact pandoc + pandoc-crossref pair the desktop plugin expects.
# pandoc-crossref is built against one specific pandoc version — bump both
# together, matching what the crossref release notes say it was built with
# (keep in sync with ../github-actions/lavatex.yml).
FROM texlive/texlive:latest-full

ARG PANDOC_VERSION=3.10.1
ARG CROSSREF_VERSION=v0.3.25
ARG TECTONIC_VERSION=0.17.0

RUN apt-get update \
 && apt-get install -y --no-install-recommends nodejs ca-certificates curl xz-utils \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz" \
      | tar -xz --strip-components=1 -C /usr/local \
 && curl -fsSL "https://github.com/lierdakil/pandoc-crossref/releases/download/${CROSSREF_VERSION}/pandoc-crossref-Linux-X64.tar.xz" \
      | tar -xJ -C /usr/local/bin \
 && chmod +x /usr/local/bin/pandoc-crossref \
 && curl -fsSL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
      | tar -xz -C /usr/local/bin \
 && pandoc --version | head -1 && pandoc-crossref --version && tectonic --version

RUN useradd --create-home --uid 10001 lavatex
WORKDIR /app
COPY server.mjs .
USER lavatex

ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
