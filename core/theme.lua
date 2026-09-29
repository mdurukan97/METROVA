local M = {}

local function c(r, g, b, a)
    return vmath.vector4(r / 255, g / 255, b / 255, a or 1)
end

M.colors = {
    bg = c(4, 14, 28),
    bg_deep = c(2, 8, 18),
    panel = c(7, 24, 43, 0.96),
    panel_soft = c(10, 35, 60, 0.88),
    panel_hover = c(17, 55, 91, 0.96),
    border = c(29, 90, 145, 0.72),
    white = c(242, 247, 255),
    muted = c(159, 181, 205),
    blue = c(35, 127, 255),
    blue_glow = c(35, 127, 255, 0.24),
    cyan = c(43, 210, 255),
    green = c(33, 215, 153),
    red = c(255, 48, 76),
    magenta = c(255, 50, 194),
    orange = c(255, 145, 43),
    gold = c(255, 188, 58),
    water = c(6, 39, 72, 0.92),
    water_glow = c(12, 67, 111, 0.45),
    land = c(7, 21, 31),
    city_light = c(255, 180, 72, 0.52),
    city_light_cool = c(66, 165, 255, 0.40),
    black = c(0, 0, 0, 1),
}

M.route_colors = {
    M.colors.red,
    M.colors.blue,
    M.colors.green,
    M.colors.magenta,
    M.colors.orange,
}

M.reference_width = 1600
M.reference_height = 900

return M
