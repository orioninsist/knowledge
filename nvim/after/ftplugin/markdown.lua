local MAX_ITEMS = 5

local function project_root()
  local kn = vim.fn.exepath("kn")
  if kn == "" then return nil end
  local real = vim.loop.fs_realpath(kn) or kn
  return vim.fn.fnamemodify(real, ":h:h")
end

local function workspace_root()
  local project = project_root()
  if not project then return nil end
  local runtime = project .. "/.runtime/personal/runtime.env"
  if vim.fn.filereadable(runtime) ~= 1 then return nil end
  for _, line in ipairs(vim.fn.readfile(runtime)) do
    local value = line:match("^WORKSPACE_ROOT=(.+)$")
    if value then return vim.fn.fnamemodify(value, ":p") end
  end
end

local function normalize(path)
  return vim.fn.fnamemodify(path, ":p")
end

local function in_workspace(path, root)
  local p = normalize(path)
  local r = normalize(root)
  return p:sub(1, #r) == r
end

local function current_link_base()
  local col = vim.fn.col(".") - 1
  local before = vim.api.nvim_get_current_line():sub(1, col)
  local start = before:match(".*%]%(()")
  if not start then return nil, nil end
  return before:sub(start + 1), start
end

local function completion_context(base)
  local root = workspace_root()
  if not root then return nil end

  local current = vim.api.nvim_buf_get_name(0)
  if current == "" or not in_workspace(current, root) then return nil end

  local source_dir = vim.fn.fnamemodify(current, ":h")
  local dirpart = base:match("^(.*[/])") or ""
  local typed = base:sub(#dirpart + 1)
  local target_dir = normalize(source_dir .. "/" .. dirpart)

  if not in_workspace(target_dir, root) then return nil end

  local stat = vim.loop.fs_stat(target_dir)
  if not stat or stat.type ~= "directory" then return nil end

  return {
    root = root,
    dirpart = dirpart,
    typed = typed,
    target_dir = target_dir,
  }
end

local function complete_items(base)
  local ctx = completion_context(base)
  if not ctx then return {} end

  local entries = vim.fn.readdir(ctx.target_dir)
  table.sort(entries)
  local out = {}

  for _, name in ipairs(entries) do
    if #out >= MAX_ITEMS then break end
    if name:sub(1, #ctx.typed) == ctx.typed then
      local full = ctx.target_dir .. "/" .. name
      local st = vim.loop.fs_stat(full)

      if st and st.type == "directory" then
        table.insert(out, {
          word = ctx.dirpart .. name .. "/",
          abbr = name .. "/",
          menu = "[dir]",
        })
      elseif st and st.type == "file" and name:match("%.md$") then
        table.insert(out, {
          word = ctx.dirpart .. name,
          abbr = name,
          menu = "[md]",
        })
      end
    end
  end

  return out
end

function _G.knowledge_markdown_complete(findstart, base)
  if findstart == 1 then
    local _, start = current_link_base()
    if not start then return -3 end
    return start
  end
  return complete_items(base)
end

vim.bo.omnifunc = "v:lua.knowledge_markdown_complete"
