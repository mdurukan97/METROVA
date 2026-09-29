local ui = require "ui.ui_factory"
local theme = require "core.theme"
local geom = require "core.geom"
local istanbul = require "data.istanbul"
local network_system = require "systems.network"
local simulation_system = require "systems.simulation"

local M = {}
local C = theme.colors

local function station_by_id(ctx, id)
    return ctx.station_index[id]
end

local function find_station(ctx, x, y, radius)
    local p = vmath.vector3(x, y, 0)
    local best = nil
    local best_distance = radius or 34
    for _, station in ipairs(ctx.stations) do
        local d = geom.distance(p, station.pos)
        if d <= best_distance then
            best = station
            best_distance = d
        end
    end
    return best
end

local function add_city_texture(ctx)
    math.randomseed(29112026)
    for i = 1, 220 do
        local x = math.random(85, 1580)
        local y = math.random(75, 790)
        if not (x > 805 and x < 980 and y > 120 and y < 780) then
            local s = math.random(2, 5)
            local col = (i % 7 == 0) and C.city_light_cool or C.city_light
            ui.box(ctx, x, y, s, s, col)
        end
    end
end

local function add_water(ctx)
    for _, seg in ipairs(istanbul.water_segments) do
        ui.line(ctx, seg.a, seg.b, seg.width + 28, C.water_glow)
        ui.line(ctx, seg.a, seg.b, seg.width, C.water)
    end
    for _, seg in ipairs(istanbul.halic_segments) do
        ui.line(ctx, seg.a, seg.b, seg.width + 18, C.water_glow)
        ui.line(ctx, seg.a, seg.b, seg.width, C.water)
    end
end

local function add_hud(ctx)
    ui.box(ctx, 800, 855, 1600, 90, vmath.vector4(0.015, 0.052, 0.086, 0.98))
    ui.panel(ctx, 180, 855, 340, 72, C.panel, C.border)
    ui.text(ctx, 35, 871, "ISTANBUL", 1.18, C.white, gui.PIVOT_W)
    ui.text(ctx, 35, 842, "IST-01  -  Ilk Hat", 0.72, C.muted, gui.PIVOT_W)

    ui.panel(ctx, 505, 855, 265, 72, C.panel, C.border)
    ui.text(ctx, 390, 873, "HEDEF", 0.70, C.muted, gui.PIVOT_W)
    ctx.goal_text = ui.text(ctx, 390, 844, "En az 5 istasyonu bagla  0/5", 0.80, C.white, gui.PIVOT_W)

    ui.panel(ctx, 800, 855, 285, 72, C.panel, C.border)
    ctx.budget_text = ui.text(ctx, 675, 870, "TL  1,245,000", 0.93, C.white, gui.PIVOT_W)
    ctx.income_text = ui.text(ctx, 675, 842, "+52,300 / yil", 0.72, C.green, gui.PIVOT_W)

    ui.panel(ctx, 1052, 855, 190, 72, C.panel, C.border)
    ctx.approval_text = ui.text(ctx, 970, 870, "Memnuniyet %74", 0.75, C.white, gui.PIVOT_W)
    ctx.passenger_text = ui.text(ctx, 970, 842, "Yolcu 0", 0.66, C.cyan, gui.PIVOT_W)

    ui.panel(ctx, 1322, 855, 290, 72, C.panel, C.border)
    ctx.date_text = ui.text(ctx, 1200, 858, "2028 / Nis", 0.80, C.white, gui.PIVOT_W)
    ctx.buttons.pause = ui.button(ctx, 1360, 855, 52, 50, "II", C.panel_hover, C.border, C.white, 0.95)
    ctx.buttons.speed1 = ui.button(ctx, 1422, 855, 48, 50, "1x", C.panel, C.border, C.white, 0.78)
    ctx.buttons.speed2 = ui.button(ctx, 1480, 855, 48, 50, "2x", C.blue, C.blue, C.white, 0.78)
    ctx.buttons.speed3 = ui.button(ctx, 1538, 855, 48, 50, "3x", C.panel, C.border, C.white, 0.78)

    -- Left construction palette
    ui.panel(ctx, 42, 470, 66, 420, C.panel, C.border)
    ui.button(ctx, 42, 650, 54, 62, "HAT", C.blue, C.blue, C.white, 0.78)
    ui.text(ctx, 42, 590, "+", 1.75, C.white, gui.PIVOT_CENTER)
    ui.text(ctx, 42, 550, "IST", 0.66, C.muted, gui.PIVOT_CENTER)
    ui.text(ctx, 42, 485, "TUN", 0.66, C.muted, gui.PIVOT_CENTER)
    ui.text(ctx, 42, 422, "KPR", 0.66, C.muted, gui.PIVOT_CENTER)
    ui.text(ctx, 42, 355, "TRN", 0.66, C.muted, gui.PIVOT_CENTER)

    ctx.buttons.home = ui.button(ctx, 1540, 60, 90, 44, "ANA", C.panel, C.border, C.white, 0.74)

    ui.panel(ctx, 1380, 760, 360, 82, C.panel, C.border)
    ui.text(ctx, 1225, 778, "YENI YOLCU TALEBI", 0.72, C.red, gui.PIVOT_W)
    ui.text(ctx, 1225, 748, "Kadikoy bolgesinde yogunluk artiyor.", 0.62, C.muted, gui.PIVOT_W)
end

local function add_station_visual(ctx, station)
    station.glow = ui.circle(ctx, station.pos.x, station.pos.y, 34, vmath.vector4(0.12, 0.55, 1.0, 0.17))
    station.ring = ui.circle(ctx, station.pos.x, station.pos.y, 22, C.white)
    station.core = ui.circle(ctx, station.pos.x, station.pos.y, 13, C.blue)

    local pivot = station.pos.x > 1180 and gui.PIVOT_E or gui.PIVOT_W
    local label_x = station.pos.x + ((pivot == gui.PIVOT_E) and -18 or 18)
    station.label = ui.text(ctx, label_x, station.pos.y + 23, station.name:upper(), 0.60, C.white, pivot)
end

local function create_train(ctx, edge, a, b, color)
    local train = {
        edge = edge,
        a = a,
        b = b,
        t = 0,
        direction = 1,
        speed = 0.18 + (#ctx.trains % 3) * 0.03,
    }
    train.glow = ui.circle(ctx, a.pos.x, a.pos.y, 24, vmath.vector4(color.x, color.y, color.z, 0.18))
    train.node = ui.box(ctx, a.pos.x, a.pos.y, 26, 11, color)
    local angle = geom.atan2(b.pos.y - a.pos.y, b.pos.x - a.pos.x)
    gui.set_rotation(train.node, vmath.quat_rotation_z(angle))
    table.insert(ctx.trains, train)
end

local function create_route(ctx, a, b)
    local color_index = ((#ctx.network.edges) % #theme.route_colors) + 1
    local edge = network_system.add_edge(ctx.network, a.id, b.id, color_index)
    if not edge then
        return false
    end

    local color = theme.route_colors[color_index]
    local glow_color = vmath.vector4(color.x, color.y, color.z, 0.20)
    ui.neon_line(ctx, a.pos, b.pos, 8, color, glow_color)
    ui.circle(ctx, a.pos.x, a.pos.y, 18, C.white)
    ui.circle(ctx, a.pos.x, a.pos.y, 10, color)
    ui.circle(ctx, b.pos.x, b.pos.y, 18, C.white)
    ui.circle(ctx, b.pos.x, b.pos.y, 10, color)
    create_train(ctx, edge, a, b, color)

    return true
end

local function delete_preview(ctx)
    if ctx.preview_glow then
        ui.remove(ctx, ctx.preview_glow)
        ctx.preview_glow = nil
    end
    if ctx.preview_core then
        ui.remove(ctx, ctx.preview_core)
        ctx.preview_core = nil
    end
end

local function set_preview(ctx, from, to)
    delete_preview(ctx)
    local color = theme.route_colors[((#ctx.network.edges) % #theme.route_colors) + 1]
    local glow_color = vmath.vector4(color.x, color.y, color.z, 0.20)
    ctx.preview_glow, ctx.preview_core = ui.neon_line(ctx, from, to, 7, color, glow_color)
end

local function update_hud(ctx)
    local connected = network_system.connected_count(ctx.network)
    if connected >= 5 then
        gui.set_text(ctx.goal_text, "HEDEF TAMAMLANDI  " .. connected .. "/5")
        gui.set_color(ctx.goal_text, C.green)
    else
        gui.set_text(ctx.goal_text, "En az 5 istasyonu bagla  " .. connected .. "/5")
    end

    local sim = ctx.simulation
    gui.set_text(ctx.budget_text, string.format("TL  %d", math.floor(sim.budget)))
    gui.set_text(ctx.passenger_text, string.format("Yolcu %d", math.floor(sim.passengers)))
    gui.set_text(ctx.date_text, string.format("%d / %02d", sim.year, sim.month))
end

function M.build(ctx)
    ctx.screen = "game"
    ctx.buttons = {}
    ctx.network = network_system.new()
    ctx.simulation = simulation_system.new()
    ctx.simulation.speed = 2
    ctx.stations = {}
    ctx.station_index = {}
    ctx.trains = {}
    ctx.drag_start = nil
    ctx.hud_clock = 0

    ui.box(ctx, 800, 450, 1600, 900, C.land)
    add_city_texture(ctx)
    add_water(ctx)

    -- Bosphorus / Golden Horn labels
    ui.text(ctx, 936, 460, "ISTANBUL BOGAZI", 0.58, vmath.vector4(0.35, 0.72, 1, 0.85), gui.PIVOT_CENTER)
    ui.text(ctx, 730, 455, "HALIC", 0.50, vmath.vector4(0.35, 0.72, 1, 0.70), gui.PIVOT_CENTER)

    for _, src in ipairs(istanbul.stations) do
        local station = {
            id = src.id,
            name = src.name,
            side = src.side,
            pos = vmath.vector3(src.x, src.y, 0),
        }
        table.insert(ctx.stations, station)
        ctx.station_index[station.id] = station
        add_station_visual(ctx, station)
    end

    add_hud(ctx)
end

function M.update(ctx, dt)
    simulation_system.update(ctx.simulation, dt, #ctx.network.edges)

    if not ctx.simulation.paused then
        local speed = ctx.simulation.speed
        for _, train in ipairs(ctx.trains) do
            train.t = train.t + dt * train.speed * speed * train.direction
            if train.t >= 1 then
                train.t = 1
                train.direction = -1
            elseif train.t <= 0 then
                train.t = 0
                train.direction = 1
            end
            local pos = geom.lerp(train.a.pos, train.b.pos, train.t)
            gui.set_position(train.node, pos)
            gui.set_position(train.glow, pos)
        end
    end

    ctx.hud_clock = ctx.hud_clock + dt
    if ctx.hud_clock > 0.15 then
        ctx.hud_clock = 0
        update_hud(ctx)
    end
end

function M.on_input(ctx, action)
    if action.released and ui.hit(ctx.buttons.home, action.x, action.y) then
        delete_preview(ctx)
        return "home"
    end

    if action.released and ui.hit(ctx.buttons.pause, action.x, action.y) then
        simulation_system.toggle_pause(ctx.simulation)
        return nil
    end
    if action.released and ui.hit(ctx.buttons.speed1, action.x, action.y) then
        simulation_system.set_speed(ctx.simulation, 1)
        return nil
    end
    if action.released and ui.hit(ctx.buttons.speed2, action.x, action.y) then
        simulation_system.set_speed(ctx.simulation, 2)
        return nil
    end
    if action.released and ui.hit(ctx.buttons.speed3, action.x, action.y) then
        simulation_system.set_speed(ctx.simulation, 3)
        return nil
    end

    if action.pressed then
        local station = find_station(ctx, action.x, action.y, 42)
        if station then
            ctx.drag_start = station
            set_preview(ctx, station.pos, vmath.vector3(action.x, action.y, 0))
        end
        return nil
    end

    if ctx.drag_start and not action.released then
        set_preview(ctx, ctx.drag_start.pos, vmath.vector3(action.x, action.y, 0))
        return nil
    end

    if action.released and ctx.drag_start then
        local start = ctx.drag_start
        local target = find_station(ctx, action.x, action.y, 46)
        delete_preview(ctx)
        ctx.drag_start = nil
        if target and target.id ~= start.id then
            create_route(ctx, start, target)
            update_hud(ctx)
        end
    end

    return nil
end

function M.cancel_drag(ctx)
    delete_preview(ctx)
    ctx.drag_start = nil
end

return M
