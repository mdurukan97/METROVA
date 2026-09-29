local ui = require "ui.ui_factory"
local theme = require "core.theme"
local geom = require "core.geom"
local istanbul = require "data.istanbul"
local network_system = require "systems.network"
local simulation_system = require "systems.simulation"

local M = {}
local C = theme.colors

local LABEL_OFFSETS = {
    beyoglu = { dx = -18, dy = -22, pivot = gui.PIVOT_E },
    taksim = { dx = 18, dy = -20, pivot = gui.PIVOT_W },
    sisli = { dx = 18, dy = 18, pivot = gui.PIVOT_W },
    mecidiyekoy = { dx = -18, dy = 18, pivot = gui.PIVOT_E },
    kagithane = { dx = -18, dy = 18, pivot = gui.PIVOT_E },
    besiktas = { dx = 18, dy = -18, pivot = gui.PIVOT_W },
    levent = { dx = 18, dy = 18, pivot = gui.PIVOT_W },
    uskudar = { dx = 18, dy = 18, pivot = gui.PIVOT_W },
    kadikoy = { dx = 18, dy = -20, pivot = gui.PIVOT_W },
    umraniye = { dx = 18, dy = 18, pivot = gui.PIVOT_W },
    atasehir = { dx = 18, dy = -20, pivot = gui.PIVOT_W },
    bostanci = { dx = -18, dy = -20, pivot = gui.PIVOT_E },
    maltepe = { dx = -18, dy = 18, pivot = gui.PIVOT_E },
    kartal = { dx = -18, dy = 18, pivot = gui.PIVOT_E },
    pendik = { dx = -18, dy = -20, pivot = gui.PIVOT_E },
    sabiha = { dx = -18, dy = 18, pivot = gui.PIVOT_E },
}

local function find_station(ctx, x, y, radius)
    local p = vmath.vector3(x, y, 0)
    local best = nil
    local best_distance = radius or 30
    for _, station in ipairs(ctx.stations) do
        local d = geom.distance(p, station.pos)
        if d <= best_distance then
            best = station
            best_distance = d
        end
    end
    return best
end

local function draw_polyline(ctx, points, thickness, color)
    for i = 1, #points - 1 do
        ui.line(ctx, points[i], points[i + 1], thickness, color)
    end
end

local function draw_rounded_polyline(ctx, points, width, color, glow_color)
    for i = 1, #points - 1 do
        ui.line(ctx, points[i], points[i + 1], width + 18, glow_color)
        ui.line(ctx, points[i], points[i + 1], width, color)
    end
    for _, p in ipairs(points) do
        ui.circle(ctx, p.x, p.y, width + 18, glow_color)
        ui.circle(ctx, p.x, p.y, width, color)
    end
end

local function add_city_texture(ctx)
    math.randomseed(2909202603)
    for i = 1, 280 do
        local x = math.random(105, 1535)
        local y = math.random(105, 785)
        local s = math.random(2, 4)
        local col = (i % 8 == 0) and C.city_light_cool or C.city_light
        ui.box(ctx, x, y, s, s, col)
    end
end

local function add_geography(ctx)
    -- Subtle metropolitan road skeleton.
    for _, road in ipairs(istanbul.roads) do
        draw_polyline(ctx, road, 1.4, vmath.vector4(0.22, 0.42, 0.58, 0.18))
        for _, p in ipairs(road) do
            ui.circle(ctx, p.x, p.y, 4, vmath.vector4(0.22, 0.42, 0.58, 0.10))
        end
    end

    -- Küçükçekmece lagoon.
    ui.circle(ctx, istanbul.kucukcekmece_lake.center.x, istanbul.kucukcekmece_lake.center.y,
        istanbul.kucukcekmece_lake.diameter + 18, C.water_glow)
    ui.circle(ctx, istanbul.kucukcekmece_lake.center.x, istanbul.kucukcekmece_lake.center.y,
        istanbul.kucukcekmece_lake.diameter, C.water)

    -- Bosphorus and Golden Horn are continuous curved corridors.
    draw_rounded_polyline(ctx, istanbul.bosphorus.points, istanbul.bosphorus.width, C.water, C.water_glow)
    draw_rounded_polyline(ctx, istanbul.halic.points, istanbul.halic.width, C.water, C.water_glow)

    -- Coastline trace makes the city readable as Istanbul rather than an abstract board.
    for _, coast in ipairs(istanbul.coastlines) do
        draw_polyline(ctx, coast, 2.2, vmath.vector4(0.22, 0.58, 0.78, 0.48))
    end

    for i, bridge in ipairs(istanbul.bridges) do
        local color = (i == 1) and C.red or ((i == 2) and C.blue or C.orange)
        ui.neon_line(ctx, bridge.a, bridge.b, 3.0, color, vmath.vector4(color.x, color.y, color.z, 0.10))
    end

    for _, label in ipairs(istanbul.labels) do
        local node = ui.text(ctx, label.pos.x, label.pos.y, label.text, 0.48,
            vmath.vector4(0.38, 0.72, 1.0, 0.70), gui.PIVOT_CENTER)
        gui.set_rotation(node, vmath.quat_rotation_z(math.rad(label.angle or 0)))
    end
end

local function add_hud(ctx)
    ui.box(ctx, 800, 855, 1600, 90, vmath.vector4(0.012, 0.045, 0.078, 0.985))

    ui.panel(ctx, 180, 855, 340, 72, C.panel, C.border)
    ui.text(ctx, 35, 871, "İSTANBUL", 1.18, C.white, gui.PIVOT_W)
    ui.text(ctx, 35, 842, "IST-01  -  İlk Hat", 0.72, C.muted, gui.PIVOT_W)

    ui.panel(ctx, 505, 855, 265, 72, C.panel, C.border)
    ui.text(ctx, 390, 873, "HEDEF", 0.70, C.muted, gui.PIVOT_W)
    ctx.goal_text = ui.text(ctx, 390, 844, "5 istasyonu bağla  0/5", 0.80, C.white, gui.PIVOT_W)

    ui.panel(ctx, 800, 855, 285, 72, C.panel, C.border)
    ctx.budget_text = ui.text(ctx, 675, 870, "TL  1.245.000", 0.93, C.white, gui.PIVOT_W)
    ctx.income_text = ui.text(ctx, 675, 842, "+TL 52.300 / yıl", 0.72, C.green, gui.PIVOT_W)

    ui.panel(ctx, 1052, 855, 190, 72, C.panel, C.border)
    ctx.approval_text = ui.text(ctx, 970, 870, "Memnuniyet %74", 0.75, C.white, gui.PIVOT_W)
    ctx.passenger_text = ui.text(ctx, 970, 842, "Yolcu 0", 0.66, C.cyan, gui.PIVOT_W)

    ui.panel(ctx, 1322, 855, 290, 72, C.panel, C.border)
    ctx.date_text = ui.text(ctx, 1200, 858, "2028 / Nis", 0.80, C.white, gui.PIVOT_W)
    ctx.buttons.pause = ui.button(ctx, 1360, 855, 52, 50, "II", C.panel_hover, C.border, C.white, 0.95)
    ctx.buttons.speed1 = ui.button(ctx, 1422, 855, 48, 50, "1x", C.panel, C.border, C.white, 0.78)
    ctx.buttons.speed2 = ui.button(ctx, 1480, 855, 48, 50, "2x", C.blue, C.blue, C.white, 0.78)
    ctx.buttons.speed3 = ui.button(ctx, 1538, 855, 48, 50, "3x", C.panel, C.border, C.white, 0.78)

    ui.panel(ctx, 42, 470, 66, 420, C.panel, C.border)
    ui.button(ctx, 42, 650, 54, 62, "HAT", C.blue, C.blue, C.white, 0.78)
    ui.text(ctx, 42, 590, "+", 1.75, C.white, gui.PIVOT_CENTER)
    ui.text(ctx, 42, 550, "İST", 0.66, C.muted, gui.PIVOT_CENTER)
    ui.text(ctx, 42, 485, "TÜN", 0.66, C.muted, gui.PIVOT_CENTER)
    ui.text(ctx, 42, 422, "KPR", 0.66, C.muted, gui.PIVOT_CENTER)
    ui.text(ctx, 42, 355, "TRN", 0.66, C.muted, gui.PIVOT_CENTER)

    ctx.buttons.home = ui.button(ctx, 1540, 60, 90, 44, "ANA", C.panel, C.border, C.white, 0.74)

    ui.panel(ctx, 1365, 758, 390, 86, C.panel, C.border)
    ui.text(ctx, 1195, 780, "YENİ YOLCU TALEBİ", 0.72, C.red, gui.PIVOT_W)
    ui.text(ctx, 1195, 748, "Kadıköy bölgesinde yoğunluk artıyor.", 0.62, C.muted, gui.PIVOT_W)

    ui.panel(ctx, 275, 70, 390, 50, vmath.vector4(0.025, 0.085, 0.135, 0.92), C.border)
    ui.text(ctx, 102, 70, "İstasyona basılı tut - diğer istasyonların üzerinden geç", 0.58, C.muted, gui.PIVOT_W)
end

local function add_station_visual(ctx, station)
    station.glow = ui.circle(ctx, station.pos.x, station.pos.y, 30, vmath.vector4(0.12, 0.55, 1.0, 0.15))
    station.ring = ui.circle(ctx, station.pos.x, station.pos.y, 20, C.white)
    station.core = ui.circle(ctx, station.pos.x, station.pos.y, 11, C.blue)

    local offset = LABEL_OFFSETS[station.id]
    local pivot
    local dx
    local dy
    if offset then
        pivot = offset.pivot
        dx = offset.dx
        dy = offset.dy
    else
        pivot = station.pos.x > 1180 and gui.PIVOT_E or gui.PIVOT_W
        dx = (pivot == gui.PIVOT_E) and -16 or 16
        dy = 19
    end

    station.label = ui.text(ctx, station.pos.x + dx, station.pos.y + dy,
        station.name:upper(), 0.48, C.white, pivot)
end

local function route_contains(route, station_id)
    for _, station in ipairs(route.stops) do
        if station.id == station_id then
            return true
        end
    end
    return false
end

local function draw_route_segment(ctx, a, b, color)
    local glow = vmath.vector4(color.x, color.y, color.z, 0.20)
    ui.neon_line(ctx, a.pos, b.pos, 7, color, glow)
    ui.circle(ctx, a.pos.x, a.pos.y, 17, C.white)
    ui.circle(ctx, a.pos.x, a.pos.y, 10, color)
    ui.circle(ctx, b.pos.x, b.pos.y, 17, C.white)
    ui.circle(ctx, b.pos.x, b.pos.y, 10, color)
end

local function orient_train(train)
    local a = train.route.stops[train.i]
    local b = train.route.stops[train.j]
    gui.set_rotation(train.node, vmath.quat_rotation_z(ui.design_angle(a.pos, b.pos)))
end

local function create_route_train(ctx, route)
    local first = route.stops[1]
    local second = route.stops[2]
    local color = theme.route_colors[route.color_index]
    local train = {
        route = route,
        i = 1,
        j = 2,
        t = 0,
        direction = 1,
        speed = 0.23 + (#ctx.trains % 3) * 0.025,
    }

    train.glow = ui.circle(ctx, first.pos.x, first.pos.y, 24,
        vmath.vector4(color.x, color.y, color.z, 0.18))
    train.node = ui.box(ctx, first.pos.x, first.pos.y, 30, 11, color)
    orient_train(train)
    table.insert(ctx.trains, train)
end

local function delete_preview(ctx)
    if not ctx.preview_nodes then return end
    for _, node in ipairs(ctx.preview_nodes) do
        ui.remove(ctx, node)
    end
    ctx.preview_nodes = nil
end

local function set_preview(ctx, from, to, color_index)
    delete_preview(ctx)
    local color = theme.route_colors[color_index]
    local glow = vmath.vector4(color.x, color.y, color.z, 0.18)
    local a, b, c = ui.neon_line(ctx, from, to, 5.5, color, glow)
    ctx.preview_nodes = { a, b, c }
end

local function begin_route(ctx, station, pointer)
    local color_index = ((#ctx.routes) % #theme.route_colors) + 1
    ctx.route_draft = {
        id = #ctx.routes + 1,
        color_index = color_index,
        stops = { station },
    }
    set_preview(ctx, station.pos, pointer, color_index)
end

local function append_station(ctx, station)
    local route = ctx.route_draft
    if not route then return false end

    local last = route.stops[#route.stops]
    if not last or station.id == last.id or route_contains(route, station.id) then
        return false
    end

    network_system.add_edge(ctx.network, last.id, station.id, route.color_index)
    local color = theme.route_colors[route.color_index]
    draw_route_segment(ctx, last, station, color)
    table.insert(route.stops, station)
    return true
end

local function finish_route(ctx)
    local route = ctx.route_draft
    delete_preview(ctx)
    ctx.route_draft = nil

    if not route or #route.stops < 2 then
        return false
    end

    table.insert(ctx.routes, route)
    create_route_train(ctx, route)
    return true
end

local function advance_train(train, amount)
    train.t = train.t + amount

    local guard = 0
    while train.t >= 1 and guard < 8 do
        train.t = train.t - 1
        train.i = train.j

        if train.direction == 1 then
            if train.i >= #train.route.stops then
                train.direction = -1
                train.j = train.i - 1
            else
                train.j = train.i + 1
            end
        else
            if train.i <= 1 then
                train.direction = 1
                train.j = 2
            else
                train.j = train.i - 1
            end
        end

        orient_train(train)
        guard = guard + 1
    end
end

local function update_hud(ctx)
    local connected = network_system.connected_count(ctx.network)
    if connected >= 5 then
        gui.set_text(ctx.goal_text, "HEDEF TAMAMLANDI  " .. connected .. "/5")
        gui.set_color(ctx.goal_text, C.green)
    else
        gui.set_text(ctx.goal_text, "5 istasyonu bağla  " .. connected .. "/5")
        gui.set_color(ctx.goal_text, C.white)
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
    ctx.routes = {}
    ctx.trains = {}
    ctx.route_draft = nil
    ctx.preview_nodes = nil
    ctx.hud_clock = 0

    ui.box(ctx, 800, 450, 1600, 900, C.land)
    add_city_texture(ctx)
    add_geography(ctx)

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
            advance_train(train, dt * train.speed * speed)
            local a = train.route.stops[train.i]
            local b = train.route.stops[train.j]
            local pos = geom.lerp(a.pos, b.pos, train.t)
            ui.set_position(train.node, pos)
            ui.set_position(train.glow, pos)
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
        ctx.route_draft = nil
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

    local pointer = vmath.vector3(action.x, action.y, 0)

    if action.pressed then
        local station = find_station(ctx, action.x, action.y, 34)
        if station then
            begin_route(ctx, station, pointer)
        end
        return nil
    end

    if ctx.route_draft and not action.released then
        local station = find_station(ctx, action.x, action.y, 30)
        if station then
            append_station(ctx, station)
        end
        local last = ctx.route_draft.stops[#ctx.route_draft.stops]
        set_preview(ctx, last.pos, pointer, ctx.route_draft.color_index)
        return nil
    end

    if action.released and ctx.route_draft then
        local station = find_station(ctx, action.x, action.y, 38)
        if station then
            append_station(ctx, station)
        end
        finish_route(ctx)
        update_hud(ctx)
    end

    return nil
end

function M.cancel_drag(ctx)
    delete_preview(ctx)
    ctx.route_draft = nil
end

return M
