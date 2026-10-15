#!/bin/sh
# Renders the original PDF and the exported one page by page, for a
# side-by-side visual check after converting:
#
#   sh render_compare.sh <original.pdf> <exported.pdf> <out-dir>
#
# Writes <out-dir>/original-N.png and <out-dir>/exported-N.png; read both
# for each page and compare title block, numbering, theorem style
# (italic vs upright body), math symbols/fonts, diagrams and images.
set -eu
mkdir -p "$3"
pdftoppm -r 110 -png "$1" "$3/original"
pdftoppm -r 110 -png "$2" "$3/exported"
echo "original: $(pdfinfo "$1" | sed -n 's/^Pages: *//p') page(s), exported: $(pdfinfo "$2" | sed -n 's/^Pages: *//p') page(s)"
ls "$3"
