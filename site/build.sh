#!/usr/bin/env bash
# Builds site/*.md into docs/ (the GitHub Pages source) via pandoc, using
# template.html + style.css. Mirrors how the plugin itself uses pandoc
# templates for the LaTeX export -- one tool, one pattern, throughout.
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p ../docs
cp style.css ../docs/style.css
touch ../docs/.nojekyll

build() {
	local src="$1" out="$2" title="$3"
	pandoc "$src" \
		--standalone \
		--template=template.html \
		--metadata title="$title" \
		-o "../docs/$out"
	echo "built docs/$out"
}

build home.md index.html "Home"
build architecture.md architecture.html "Architecture"
build spec.md spec.html "Spec"
