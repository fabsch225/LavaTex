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

-- Entries with `like: proof` (e.g. a Solution) aren't \newtheorem's: they
-- typeset as amsthm's proof with their own name, so they're taken out of
-- the list the template declares and remembered here as id -> name.
local prooflike = {}

function Meta(meta)
	if meta.theorems then
		local declared = pandoc.List()
		for _, env in ipairs(meta.theorems) do
			if env.id then
				local id = pandoc.utils.stringify(env.id)
				known[id] = true
				if env.like and pandoc.utils.stringify(env.like) == "proof" then
					prooflike[id] = pandoc.utils.stringify(env.name or env.id)
				else
					declared:insert(env)
				end
			else
				declared:insert(env)
			end
		end
		meta.theorems = declared
		return meta
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
			local env = class
			if prooflike[class] then
				env = "proof"
				local name = prooflike[class]
				if el.attributes.title then
					name = name .. " (" .. renderTitle(el.attributes.title) .. ")"
				end
				opt = "[" .. name .. "]"
			elseif el.attributes.title then
				opt = "[" .. renderTitle(el.attributes.title) .. "]"
			end
			local label = ""
			if el.identifier ~= "" then
				label = "\\label{" .. el.identifier .. "}"
			end

			local blocks = pandoc.List({
				pandoc.RawBlock("latex", "\\begin{" .. env .. "}" .. opt .. label),
			})
			blocks:extend(el.content)
			blocks:insert(pandoc.RawBlock("latex", "\\end{" .. env .. "}"))
			return blocks
		end
	end
	return el
end

-- pdflatex has no glyphs for emoji and aborts on the first one ("Unicode
-- character ... not set up for use with LaTeX"). Colored circles and
-- squares, which notes use as markers (e.g. ==🔴text==), become a bullet or
-- square in that color; every other emoji, and the joiners/variation
-- selectors around them, is dropped. Code can't hold a marker, so there
-- all emoji are dropped. Math is left alone.
local colored = {
	[0x1F534] = { "red", "dot" }, [0x1F535] = { "blue", "dot" },
	[0x1F7E0] = { "orange", "dot" }, [0x1F7E1] = { "yellow", "dot" },
	[0x1F7E2] = { "green", "dot" }, [0x1F7E3] = { "purple", "dot" },
	[0x1F7E4] = { "brown", "dot" }, [0x26AB] = { "black", "dot" },
	[0x1F7E5] = { "red", "square" }, [0x1F7E6] = { "blue", "square" },
	[0x1F7E7] = { "orange", "square" }, [0x1F7E8] = { "yellow", "square" },
	[0x1F7E9] = { "green", "square" }, [0x1F7EA] = { "purple", "square" },
	[0x1F7EB] = { "brown", "square" }, [0x2B1B] = { "black", "square" },
}

local function isEmoji(cp)
	return (cp >= 0x1F000 and cp <= 0x1FAFF) -- pictographs, emoticons, flags, skin tones
		or (cp >= 0x2600 and cp <= 0x27BF) -- misc symbols, dingbats
		or (cp >= 0x2B00 and cp <= 0x2BFF) -- misc symbols and arrows (⬛, ⭐)
		or cp == 0xFE0F or cp == 0xFE0E or cp == 0x200D or cp == 0x20E3
end

-- \protect keeps the marker intact inside soul's \hl, which otherwise
-- tokenizes its argument letter by letter.
local function marker(color, shape)
	local glyph = shape == "dot" and "\\textbullet" or "\\rule{0.6em}{0.6em}"
	return "\\protect\\textcolor{" .. color .. "}{" .. glyph .. "}"
end

-- A colored circle inside a highlight (==🔴text==) picks the highlight's
-- color instead of printing a marker: soul's \hl paints with whatever
-- \sethlcolor set, scoped here by a group. Tints keep the text readable.
local highlightColors = {
	[0x1F534] = "red!35", [0x1F535] = "blue!30", [0x1F7E0] = "orange!45",
	[0x1F7E1] = "yellow", [0x1F7E2] = "green!35", [0x1F7E3] = "purple!30",
	[0x1F7E4] = "brown!35", [0x26AB] = "black!25",
}

function Span(el)
	if not el.classes:includes("mark") then
		return nil
	end
	local color
	for i, inline in ipairs(el.content) do
		if inline.t == "Str" and inline.text:find("[\226-\240]") then
			local kept = {}
			for _, cp in utf8.codes(inline.text) do
				if highlightColors[cp] then
					color = color or highlightColors[cp]
				else
					kept[#kept + 1] = utf8.char(cp)
				end
			end
			el.content[i] = pandoc.Str(table.concat(kept))
		end
	end
	if not color then
		return nil
	end
	-- Drop a space left behind by "==🔴 text==".
	while #el.content > 0 and (el.content[1].t == "Space"
			or (el.content[1].t == "Str" and el.content[1].text == "")) do
		el.content:remove(1)
	end
	return {
		pandoc.RawInline("latex", "{\\sethlcolor{" .. color .. "}"),
		el,
		pandoc.RawInline("latex", "}"),
	}
end

function Str(el)
	if not el.text:find("[\226-\240]") then
		return nil
	end
	local out = pandoc.List()
	local buf = {}
	local changed = false
	local function flush()
		if #buf > 0 then
			out:insert(pandoc.Str(table.concat(buf)))
			buf = {}
		end
	end
	for _, cp in utf8.codes(el.text) do
		local c = colored[cp]
		if c then
			flush()
			out:insert(pandoc.RawInline("latex", marker(c[1], c[2])))
			changed = true
		elseif isEmoji(cp) then
			changed = true
		else
			buf[#buf + 1] = utf8.char(cp)
		end
	end
	if not changed then
		return nil
	end
	flush()
	return out
end

local function stripEmoji(text)
	if not text:find("[\226-\240]") then
		return nil
	end
	local kept = {}
	for _, cp in utf8.codes(text) do
		if not isEmoji(cp) then
			kept[#kept + 1] = utf8.char(cp)
		end
	end
	local result = table.concat(kept)
	if result == text then
		return nil
	end
	return result
end

function Code(el)
	local text = stripEmoji(el.text)
	if text then
		el.text = text
		return el
	end
end

function CodeBlock(el)
	local text = stripEmoji(el.text)
	if text then
		el.text = text
		return el
	end
end

-- Three passes, in this order: within a single filter pandoc visits blocks
-- before metadata, so `known` must be filled in before any Div is seen;
-- and highlight colors must be read before Str turns circles into markers.
return {
	{ Meta = Meta },
	{ Div = Div, Span = Span },
	{ Str = Str, Code = Code, CodeBlock = CodeBlock },
}
