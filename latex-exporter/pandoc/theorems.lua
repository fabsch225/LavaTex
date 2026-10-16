-- Converts fenced divs (::: {.theorem #label title="..."} ... :::) into
-- amsthm-style LaTeX environments. The environment name is taken from the
-- div's class, so any \newtheorem defined via the "theorems" YAML field
-- (see template.latex) works here without touching this filter.

-- `proof` always exists (amsthm); every other environment is whatever the
-- note's `theorems:` declares, collected by `Meta` below. The rest of this
-- list is only a fallback for documents without a `theorems:` field.
local known = {
	theorem = true, lemma = true, prop = true, definition = true,
	bem = true, kor = true, deflemma = true, proof = true,
}

function Meta(meta)
	if meta.theorems then
		for _, env in ipairs(meta.theorems) do
			if env.id then
				known[pandoc.utils.stringify(env.id)] = true
			end
		end
	end
end

-- Attribute values are plain strings pandoc never reparses as markdown, so
-- a title with e.g. a `` `\cite{key}`{=latex} `` raw-inline span (or math)
-- would otherwise land in the .tex completely literally, backticks and
-- all. Round-tripping through pandoc.read/write resolves it the same way
-- normal body text would.
function renderTitle(title)
	local doc = pandoc.read(title, "markdown-latex_macros+lists_without_preceding_blankline")
	return pandoc.write(doc, "latex"):gsub("%s+$", "")
end

function Div(el)
	for _, class in ipairs(el.classes) do
		if known[class] then
			local opt = ""
			if el.attributes.title then
				local title = renderTitle(el.attributes.title)
				-- amsthm's proof[...] replaces the word "Proof" entirely; keep
				-- it and add the title in parentheses, like theorem headers.
				if class == "proof" then
					title = "\\proofname{} (" .. title .. ")"
				end
				opt = "[" .. title .. "]"
			end
			local label = ""
			if el.identifier ~= "" then
				label = "\\label{" .. el.identifier .. "}"
			end

			local blocks = pandoc.List({
				pandoc.RawBlock("latex", "\\begin{" .. class .. "}" .. opt .. label),
			})
			blocks:extend(el.content)
			blocks:insert(pandoc.RawBlock("latex", "\\end{" .. class .. "}"))
			return blocks
		end
	end
	return el
end

-- Two passes, in this order: within a single filter pandoc visits blocks
-- before metadata, so `known` must be filled in before any Div is seen.
return {
	{ Meta = Meta },
	{ Div = Div },
}
