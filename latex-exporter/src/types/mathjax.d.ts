export {};

declare global {
	interface Window {
		/**
		 * MathJax's global runtime object, as loaded by Obsidian's own
		 * `loadMathJax()`. Not part of Obsidian's type definitions, so
		 * declared here — only the pieces this plugin actually touches.
		 */
		MathJax?: {
			/** Converts TeX to an (unused, by us) CHTML element, as a side effect running any \newcommand it contains through the TeX parser. */
			tex2chtml?: (input: string) => unknown;
			startup?: {
				ready?: () => void;
				defaultReady?: () => void;
			};
		};
	}
}
