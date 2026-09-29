local geom = require "core.geom"

local M = {}

local DESIGN_W = 1600
local DESIGN_H = 900
local OUTPUT_W = 1980
local SX = OUTPUT_W / DESIGN_W
local FONT_SCALE = 0.34

local function tx(x)
    return x * SX
end

local function register(ctx, node)
    table.insert(ctx.nodes, node)
    if ctx.parent then
        gui.set_parent(node, ctx.parent, true)
    end
    return node
end

function M.x_scale()
    return SX
end

function M.to_design_x(x)
    return x / SX
end

function M.set_position(node, p)
    gui.set_position(node, vmath.vector3(tx(p.x), p.y, p.z or 0))
end

function M.set_map_position(node, p)
    gui.set_position(node, vmath.vector3(
        tx(p.x) - tx(DESIGN_W * 0.5),
        p.y - DESIGN_H * 0.5,
        p.z or 0
    ))
end

function M.set_parent(ctx, parent)
    ctx.parent = parent
end

function M.design_angle(a, b)
    return geom.atan2(b.y - a.y, (b.x - a.x) * SX)
end

function M.clear(ctx)
    if not ctx.nodes then
        ctx.nodes = {}
        return
    end
    for i = #ctx.nodes, 1, -1 do
        pcall(gui.delete_node, ctx.nodes[i])
    end
    ctx.nodes = {}
    ctx.parent = nil
end

function M.remove(ctx, node)
    if not node then return end
    pcall(gui.delete_node, node)
    for i = #ctx.nodes, 1, -1 do
        if ctx.nodes[i] == node then
            table.remove(ctx.nodes, i)
            break
        end
    end
end

function M.box(ctx, x, y, w, h, color)
    local node = gui.new_box_node(vmath.vector3(tx(x), y, 0), vmath.vector3(w * SX, h, 0))
    gui.set_color(node, color)
    return register(ctx, node)
end

function M.circle(ctx, x, y, diameter, color)
    local node = gui.new_pie_node(vmath.vector3(tx(x), y, 0), vmath.vector3(diameter, diameter, 0))
    gui.set_color(node, color)
    return register(ctx, node)
end

function M.text(ctx, x, y, text, scale, color, pivot)
    local node = gui.new_text_node(vmath.vector3(tx(x), y, 0), text)
    gui.set_font(node, "ui")
    gui.set_color(node, color)
    local s = (scale or 1) * FONT_SCALE
    gui.set_scale(node, vmath.vector3(s, s, 1))
    gui.set_pivot(node, pivot or gui.PIVOT_W)
    return register(ctx, node)
end

function M.line(ctx, a, b, thickness, color)
    local ax, bx = tx(a.x), tx(b.x)
    local dx = bx - ax
    local dy = b.y - a.y
    local length = math.sqrt(dx * dx + dy * dy)
    local cx = (ax + bx) * 0.5
    local cy = (a.y + b.y) * 0.5
    local node = gui.new_box_node(vmath.vector3(cx, cy, 0), vmath.vector3(length, thickness, 0))
    gui.set_color(node, color)
    gui.set_rotation(node, vmath.quat_rotation_z(geom.atan2(dy, dx)))
    return register(ctx, node)
end

function M.neon_line(ctx, a, b, thickness, color, glow_color)
    local glow = M.line(ctx, a, b, thickness * 3.4, glow_color)
    local mid = M.line(ctx, a, b, thickness * 1.7, vmath.vector4(color.x, color.y, color.z, 0.28))
    local core = M.line(ctx, a, b, thickness, color)
    return glow, mid, core
end

function M.panel(ctx, x, y, w, h, fill, border)
    M.box(ctx, x, y, w + 4 / SX, h + 4, border)
    local panel = M.box(ctx, x, y, w, h, fill)
    -- Thin internal highlight gives flat GUI rectangles a glass-panel read.
    M.box(ctx, x, y + h * 0.5 - 1.5, math.max(1, w - 6), 2, vmath.vector4(0.46, 0.76, 1.0, 0.10))
    return panel
end

function M.button(ctx, x, y, w, h, label, fill, border, text_color, scale)
    M.panel(ctx, x, y, w, h, fill, border)
    M.text(ctx, x, y, label, scale or 1.15, text_color, gui.PIVOT_CENTER)
    return { x = x, y = y, w = w, h = h }
end

function M.hit(rect, x, y)
    return rect and geom.hit_rect(rect, x, y)
end

return M
