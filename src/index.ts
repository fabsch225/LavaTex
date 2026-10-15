export type { NoteRef, NoteReader } from "./notes";
export { getFrontmatterInfo, parseFrontmatter, stringifyFrontmatter } from "./frontmatter";

export { exportNoteToMarkdown } from "./markdown";

export type { LabelEntry } from "./latex/labelCollector";
export { collectLabels } from "./latex/labelCollector";
export { extractInlineMacros } from "./latex/inlineMacros";
export { resolveFrontmatterReferences } from "./frontmatterRefs";
export { applyDefaultFrontmatter } from "./defaultFrontmatter";

export type { LatexAssets } from "./latexExport";
export { exportNoteToLatex } from "./latexExport";
export { exportProjectToLatex } from "./project";

export { compileToPdf, openInDefaultApp } from "./pdf";
export type { CompileJob, LatexEngine } from "./pdf";

export type { PandocBackend, PandocInput } from "./pandoc/types";
export { nativePandocBackend } from "./pandoc/native";

// Not re-exported here: `wasmPandocBackend` lives at the "lavatex-core/wasm"
// entry point, gated behind the optional `pandoc-wasm` dependency — see
// ./pandoc/wasm.ts.
