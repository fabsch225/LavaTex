#!/bin/sh
# First look at a PDF before converting it to a LavaTex note:
#
#   sh inspect_pdf.sh <file.pdf> <out-dir>
#
# Prints metadata (Creator tells you whether it came from LaTeX), the
# layout-preserving text, and the embedded raster images; renders every page
# to <out-dir>/page-N.png (read those — text extraction mangles math,
# arrows and fonts) and extracts the raster images to <out-dir>/img-NNN.png.
set -eu
pdf="$1"
out="$2"
mkdir -p "$out"

echo "== metadata"
pdfinfo "$pdf" | grep -E "^(Title|Creator|Producer|Pages):" || true
echo
echo "== embedded images (none listed = only text and vector graphics)"
pdfimages -list "$pdf"
pdfimages -png "$pdf" "$out/img" 2>/dev/null || true
echo
echo "== text (layout); math in here is unreliable, check the page renders"
pdftotext -layout "$pdf" -
pdftoppm -r 110 -png "$pdf" "$out/page"
echo
echo "== written"
ls "$out"
