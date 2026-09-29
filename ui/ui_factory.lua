local geom = require "core.geom"

local M = {}

local function register(ctx, node)
    table.insert(ctx.nodes, node)
    return node
end

function M.clear(ctx)
    if not ctx.nodes then
        ctx.nodes = {}
        return
    end
    for i = #ctx.nodes, 1, -1 do
        local node = ctx.nodes[i]
        pcall(gui.delete_node, node)
    end
    ctx.nodes = {}
end

function M.remove(ctx, node)
    if not node then
        return
    end
    pcall(gui.delete_node, node)
    for i = #ctx.nodes, 1, -1 do
        if ctx.nodes[i] == node then
            table.remove(ctx.nodes, i)
            break
        end
    end
end

function M.box(ctx, x, y, w, h, color)
    local node = gui.new_box_node(vmath.vector3(x, y, 0), vmath.vector3(w, h, 0))
    gui.set_color(node, color)
    return register(ctx, node)
end

function M.circle(ctx, x, y, diameter, color)
    local node = gui.new_pie_node(vmath.vector3(x, y, 0), vmath.vector3(diameter, diameter, 0))
    gui.set_color(node, color)
    return register(ctx, node)
end

function M.text(ctx, x, y, text, scale, color, pivot)
    local node = gui.new_text_node(vmath.vector3(x, y, 0), text)
    gui.set_font(node, "default")
    gui.set_color(node, color)
    gui.set_scale(node, vmath.vector3(scale or 1, scale or 1, 1))
    gui.set_pivot(node, pivot or gui.PIVOT_W)
    return register(ctx, node)
end

function M.line(ctx, a, b, thickness, color)
    local dx = b.x - a.x
    local dy = b.y - a.y
    local length = math.sqrt(dx * dx + dy * dy)
    local cx = (a.x + b.x) * 0.5
    local cy = (a.y + b.y) * 0.5
    local node = M.box(ctx, cx, cy, length, thickness, color)
    gui.set_rotation(node, vmath.quat_rotation_z(geom.atan2(dy, dx)))
    return node
end

function M.neon_line(ctx, a, b, thickness, color, glow_color)
    local glow = M.line(ctx, a, b, thickness * 3.1, glow_color)
    local core = M.line(ctx, a, b, thickness, color)
    return glow, core
end

function M.panel(ctx, x, y, w, h, fill, border)
    M.box(ctx, x, y, w + 4, h + 4, border)
    return M.box(ctx, x, y, w, h, fill)
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
