-- Converts fenced divs (::: {.theorem #label title="..."} ... :::) into
-- amsthm-style LaTeX environments. The environment name is taken from the
-- div's class, so any \newtheorem defined via the "theorems" YAML field
-- (see template.latex) works here without touching this filter.

local known = {
	theorem = true, lemma = true, prop = true, definition = true,
	bem = true, kor = true, deflemma = true, proof = true,
}

-- Attribute values are plain strings pandoc never reparses as markdown, so
-- a title with e.g. a `` `\cite{key}`{=latex} `` raw-inline span (or math)
-- would otherwise land in the .tex completely literally, backticks and
-- all. Round-tripping through pandoc.read/write resolves it the same way
-- normal body text would.
function renderTitle(title)
	local doc = pandoc.read(title, "markdown-latex_macros")
	return pandoc.write(doc, "latex"):gsub("%s+$", "")
end

function Div(el)
	for _, class in ipairs(el.classes) do
		if known[class] then
			local opt = ""
			if el.attributes.title then
				opt = "[" .. renderTitle(el.attributes.title) .. "]"
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
