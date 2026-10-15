#!/bin/sh
# Installs or updates the LaTeX Exporter (LavaTex) Obsidian plugin to the
# newest GitHub release. Put this file in your vault's root folder and run
#
#   sh update-lavatex.sh
#
# then reload the plugin in Obsidian (or restart Obsidian). Your plugin
# settings (data.json) are kept. Pass a vault path to update a different
# vault: sh update-lavatex.sh ~/Notes
set -eu

REPO="fabsch225/LavaTex"
VAULT="${1:-$(cd "$(dirname "$0")" && pwd)}"
PLUGIN="$VAULT/.obsidian/plugins/latex-exporter"

if [ ! -d "$VAULT/.obsidian" ]; then
	echo "Not an Obsidian vault (no .obsidian folder): $VAULT" >&2
	exit 1
fi

version_of() {
	sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1" 2>/dev/null | head -n 1
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "Downloading the newest LaTeX Exporter release…"
curl -fsSL -o "$tmp/latex-exporter.zip" "https://github.com/$REPO/releases/latest/download/latex-exporter.zip"
unzip -q "$tmp/latex-exporter.zip" -d "$tmp"

new=$(version_of "$tmp/latex-exporter/manifest.json")
old=$(version_of "$PLUGIN/manifest.json")
if [ -n "$old" ] && [ "$old" = "$new" ]; then
	echo "Already up to date ($new)."
	exit 0
fi

mkdir -p "$PLUGIN"
rm -rf "$PLUGIN/pandoc"
cp -R "$tmp/latex-exporter/." "$PLUGIN/"
echo "Installed LaTeX Exporter ${new}${old:+ (was $old)} into $PLUGIN"

if ! grep -q '"latex-exporter"' "$VAULT/.obsidian/community-plugins.json" 2>/dev/null; then
	echo "Enable it under Settings → Community plugins."
else
	echo "Reload it in Obsidian (or restart Obsidian) to use the new version."
fi
