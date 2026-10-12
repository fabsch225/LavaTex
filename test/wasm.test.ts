import { afterEach, describe, expect, it, vi } from "vitest";

const convertMock = vi.fn();
// "pandoc-wasm" is an optional dependency this package never installs for
// itself (see src/pandoc/pandoc-wasm.d.ts) — mocked here as a virtual module
// so this test doesn't need it present on disk.
vi.mock("pandoc-wasm", () => ({ convert: convertMock }));

import { wasmPandocBackend } from "../src/pandoc/wasm";

afterEach(() => {
	convertMock.mockReset();
});

describe("wasmPandocBackend", () => {
	it("passes the template/lua-filter as virtual files and returns stdout", async () => {
		convertMock.mockResolvedValue({ stdout: "%% wasm latex output", stderr: "", warnings: [], files: {}, mediaFiles: {} });

		const backend = wasmPandocBackend();
		const result = await backend.convert({
			markdown: "# Hi",
			template: "$body$",
			luaFilter: "-- noop",
			headerIncludes: "\\usepackage{amsmath}",
			afterBody: "\\bibitem{x} X.",
			topLevelDivision: "chapter",
		});

		expect(result).toBe("%% wasm latex output");
		expect(convertMock).toHaveBeenCalledTimes(1);
		const [options, stdin, files] = convertMock.mock.calls[0] as [Record<string, unknown>, string, Record<string, string>];
		expect(options.from).toBe("markdown-latex_macros");
		expect(options.to).toBe("latex");
		expect(options.template).toBe("template.latex");
		expect(options["lua-filter"]).toBe("filter.lua");
		expect(options["top-level-division"]).toBe("chapter");
		expect(options["include-in-header"]).toBe("header-includes.tex");
		expect(options["include-after-body"]).toBe("after-body.tex");
		expect(stdin).toBe("# Hi");
		expect(files["template.latex"]).toBe("$body$");
		expect(files["filter.lua"]).toBe("-- noop");
		expect(files["header-includes.tex"]).toBe("\\usepackage{amsmath}");
		expect(files["after-body.tex"]).toBe("\\bibitem{x} X.");
	});

	it("omits include-in-header/include-after-body when there's nothing to include", async () => {
		convertMock.mockResolvedValue({ stdout: "out", stderr: "", warnings: [], files: {}, mediaFiles: {} });

		const backend = wasmPandocBackend();
		await backend.convert({ markdown: "x", template: "$body$", luaFilter: "-- noop" });

		const [options] = convertMock.mock.calls[0] as [Record<string, unknown>];
		expect(options["include-in-header"]).toBeUndefined();
		expect(options["include-after-body"]).toBeUndefined();
	});
});
