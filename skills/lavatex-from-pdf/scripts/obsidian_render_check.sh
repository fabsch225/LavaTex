#!/bin/sh
# Checks that a note renders in the running Obsidian (MathJax, TikZJax):
#
#   sh obsidian_render_check.sh <vault-name> <note path in vault>
#
# Uses the Obsidian CLI (Settings → Command line interface). It acts on the
# most recently active vault, so the call is guarded by the vault name and
# prints "wrong vault" instead of touching anything else. Opens the note in
# reading view and reports how many formulas/diagrams rendered and any
# MathJax or TikZJax errors. TikZJax renders asynchronously; rerun after a
# few seconds if diagrams show as pending.
set -eu
vault="$1"
note="$2"
quiet() { grep -v "Loading updated app package\|installer is out of date"; }

obsidian eval code="app.vault.getName()==='$vault' ? app.workspace.getLeaf(false).openFile(app.vault.getFileByPath('$note'), {state: {mode: 'preview'}}).then(()=>'opened $note') : 'wrong vault: CLI targets '+app.vault.getName()" 2>/dev/null | quiet
sleep 4
obsidian eval code="(()=>{ if (app.vault.getName()!=='$vault') return 'wrong vault'; const el=app.workspace.activeLeaf.view.containerEl; const math=el.querySelectorAll('mjx-container').length; const mathErr=[...el.querySelectorAll('mjx-merror, [data-mjx-error]')].map(e=>e.getAttribute('data-mjx-error')||e.textContent); const tikz=el.querySelectorAll('.block-language-tikz').length; const tikzSvg=el.querySelectorAll('.block-language-tikz svg').length; return math+' formulas, '+mathErr.length+' MathJax errors'+(mathErr.length?' ('+mathErr.join(' | ')+')':'')+'; '+tikz+' tikz blocks, '+tikzSvg+' rendered'; })()" 2>/dev/null | quiet
