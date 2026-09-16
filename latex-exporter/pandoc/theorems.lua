-- Converts fenced divs (::: {.theorem #label title="..."} ... :::) into
-- amsthm-style LaTeX environments. The environment name is taken from the
-- div's class, so any \newtheorem defined via the "theorems" YAML field
-- (see template.latex) works here without touching this filter.

local known = {
	theorem = true, lemma = true, prop = true, definition = true,
	bem = true, kor = true, deflemma = true, proof = true,
}

function Div(el)
	for _, class in ipairs(el.classes) do
		if known[class] then
			local opt = ""
			if el.attributes.title then
				opt = "[" .. el.attributes.title .. "]"
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
