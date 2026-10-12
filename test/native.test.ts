import { EventEmitter } from "events";
import * as fs from "fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
// native.ts loads builtins through `nodeRequire` (lazily, for mobile), which
// vi.mock("child_process") can't see — so stub it there instead.
vi.mock("../src/nodeRequire", () => ({
	nodeRequire: (id: string) => (id === "child_process" ? { spawn: spawnMock } : require(id)),
}));

import { nativePandocBackend } from "../src/pandoc/native";

class FakeProcess extends EventEmitter {
	stderr = new EventEmitter();
}

afterEach(() => {
	spawnMock.mockReset();
});

describe("nativePandocBackend", () => {
	it("invokes pandoc with markdown-latex_macros, the template/lua-filter it wrote to temp files, and cleans up afterwards", async () => {
		let capturedOutputPath = "";
		spawnMock.mockImplementation((_cmd: string, args: string[]) => {
			const outIndex = args.indexOf("-o");
			capturedOutputPath = args[outIndex + 1];
			const proc = new FakeProcess();
			// Simulate pandoc having written its output file, then a clean exit.
			void fs.writeFile(capturedOutputPath, "%% produced latex\n", "utf8").then(() => {
				proc.emit("close", 0);
			});
			return proc;
		});

		const backend = nativePandocBackend();
		const result = await backend.convert({
			markdown: "# Hi",
			template: "$body$",
			luaFilter: "-- noop",
			headerIncludes: "\\usepackage{amsmath}",
		});

		expect(result).toBe("%% produced latex\n");
		expect(spawnMock).toHaveBeenCalledTimes(1);
		const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
		expect(cmd).toBe("pandoc");
		expect(args).toContain("--from=markdown-latex_macros");
		expect(args).toContain("--filter");
		expect(args).toContain("pandoc-crossref");
		expect(args.some((a) => a.startsWith("--include-in-header="))).toBe(true);

		// Every temp file it wrote (input/template/filter/header/output) should be cleaned up.
		await expect(fs.access(capturedOutputPath)).rejects.toThrow();
	});

	it("rejects with a friendly message when the pandoc binary is missing", async () => {
		spawnMock.mockImplementation(() => {
			const proc = new FakeProcess();
			queueMicrotask(() => {
				const err = new Error("spawn pandoc ENOENT") as NodeJS.ErrnoException;
				err.code = "ENOENT";
				proc.emit("error", err);
			});
			return proc;
		});

		const backend = nativePandocBackend();
		await expect(
			backend.convert({ markdown: "x", template: "$body$", luaFilter: "-- noop" }),
		).rejects.toThrow(/install it/i);
	});
});
