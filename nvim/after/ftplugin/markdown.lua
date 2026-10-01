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
    if value then return value end
  end
end

local function in_workspace(path, root)
  local p = vim.fn.fnamemodify(path, ":p")
  local r = vim.fn.fnamemodify(root, ":p")
  return p:sub(1, #r) == r
end

local function complete_items(base)
  local root = workspace_root()
  if not root then return {} end

  local current = vim.api.nvim_buf_get_name(0)
  if current == "" or not in_workspace(current, root) then return {} end

  local source_dir = vim.fn.fnamemodify(current, ":h")
  local dirpart = base:match("^(.*[/])") or ""
  local typed = base:sub(#dirpart + 1)
  local target_dir = vim.fn.fnamemodify(source_dir .. "/" .. dirpart, ":p")

  if not in_workspace(target_dir, root) then return {} end

  local stat = vim.loop.fs_stat(target_dir)
  if not stat or stat.type ~= "directory" then return {} end

  local out = {}
  local entries = vim.fn.readdir(target_dir)
  table.sort(entries)

  for _, name in ipairs(entries) do
    if name:sub(1, #typed) == typed then
      local full = target_dir .. "/" .. name
      local st = vim.loop.fs_stat(full)
      if st and st.type == "directory" then
        table.insert(out, { word = dirpart .. name .. "/", menu = "[dir]" })
      elseif st and st.type == "file" and name:match("%.md$") then
        table.insert(out, { word = dirpart .. name, menu = "[md]" })
      end
    end
  end

  return out
end

function _G.knowledge_markdown_complete(findstart, base)
  if findstart == 1 then
    local col = vim.fn.col(".") - 1
    local before = vim.api.nvim_get_current_line():sub(1, col)
    local start = before:match(".*%]%(()")
    if not start then return -3 end
    return start
  end

  return complete_items(base)
end

vim.bo.omnifunc = "v:lua.knowledge_markdown_complete"
