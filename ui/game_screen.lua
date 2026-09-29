local ui = require "ui.ui_factory"
local theme = require "core.theme"
local geom = require "core.geom"
local istanbul = require "data.istanbul"
local network_system = require "systems.network"
local simulation_system = require "systems.simulation"
local passenger_system = require "systems.passengers"

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

local function clamp(v, lo, hi)
    return math.max(lo, math.min(hi, v))
end

local function apply_camera(ctx)
    if not ctx.map_root or not ctx.camera then return end
    ui.set_position(ctx.map_root, vmath.vector3(
        800 + ctx.camera.pan_x,
        450 + ctx.camera.pan_y,
        0
    ))
    gui.set_scale(ctx.map_root, vmath.vector3(ctx.camera.zoom, ctx.camera.zoom, 1))
    if ctx.zoom_text then
        gui.set_text(ctx.zoom_text, string.format("%d%%", math.floor(ctx.camera.zoom * 100 + 0.5)))
    end
end

local function screen_to_map(ctx, x, y)
    local camera = ctx.camera or { zoom = 1, pan_x = 0, pan_y = 0 }
    return vmath.vector3(
        800 + (x - 800 - camera.pan_x) / camera.zoom,
        450 + (y - 450 - camera.pan_y) / camera.zoom,
        0
    )
end

local function map_hit_radius(ctx, px)
    return px / math.max(0.82, ctx.camera and ctx.camera.zoom or 1)
end

local function is_ui_zone(x, y)
    if y >= 810 then return true end
    if x <= 78 then return true end
    if y <= 105 then return true end
    if x >= 1160 and y >= 700 then return true end
    return false
end

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

local function format_int(value)
    local s = tostring(math.floor(value))
    local out = s
    while true do
        local changed
        out, changed = out:gsub("^(-?%d+)(%d%d%d)", "%1.%2")
        if changed == 0 then break end
    end
    return out
end

local function add_city_texture(ctx)
    math.randomseed(2909202605)

    -- Distant city lights.
    for i = 1, 210 do
        local x = math.random(105, 1535)
        local y = math.random(105, 785)
        local s = math.random(2, 4)
        local col = (i % 8 == 0) and C.city_light_cool or C.city_light
        ui.box(ctx, x, y, s, s, col)
    end

    -- Compact illuminated urban clusters around the playable districts.
    for index, src in ipairs(istanbul.stations) do
        for j = 1, 5 do
            local ox = math.random(-58, 58)
            local oy = math.random(-38, 38)
            local w = math.random(7, 18)
            local h = math.random(4, 11)
            ui.box(ctx, src.x + ox, src.y + oy, w, h,
                vmath.vector4(0.055, 0.105, 0.14, 0.72))
            if (index + j) % 2 == 0 then
                ui.box(ctx, src.x + ox, src.y + oy, math.max(2, w * 0.42), 2,
                    vmath.vector4(1.0, 0.62, 0.20, 0.35))
            end
        end
    end
end

local function add_geography(ctx)
    -- Marmara and Black Sea edges establish an actual city geography.
    ui.box(ctx, 800, 36, 1600, 72, vmath.vector4(0.012, 0.085, 0.145, 0.96))
    ui.box(ctx, 800, 790, 1600, 55, vmath.vector4(0.010, 0.070, 0.125, 0.92))

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
        ui.circle(ctx, bridge.a.x, bridge.a.y, 8, C.white)
        ui.circle(ctx, bridge.b.x, bridge.b.y, 8, C.white)
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
    ctx.approval_text = ui.text(ctx, 970, 873, "Memnuniyet %74", 0.72, C.white, gui.PIVOT_W)
    ctx.passenger_text = ui.text(ctx, 970, 847, "Yolcu 0", 0.61, C.cyan, gui.PIVOT_W)
    ctx.route_text = ui.text(ctx, 970, 825, "Hat 0", 0.55, C.muted, gui.PIVOT_W)

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

    ctx.buttons.zoom_out = ui.button(ctx, 1368, 60, 44, 44, "-", C.panel, C.border, C.white, 0.90)
    ctx.zoom_text = ui.text(ctx, 1418, 60, "100%", 0.68, C.muted, gui.PIVOT_CENTER)
    ctx.buttons.zoom_in = ui.button(ctx, 1468, 60, 44, 44, "+", C.panel, C.border, C.white, 0.90)
    ctx.buttons.home = ui.button(ctx, 1540, 60, 90, 44, "ANA", C.panel, C.border, C.white, 0.74)

    ui.panel(ctx, 1365, 758, 390, 86, C.panel, C.border)
    ctx.alert_title = ui.text(ctx, 1195, 780, "YOLCU TALEBİ", 0.72, C.cyan, gui.PIVOT_W)
    ctx.alert_body = ui.text(ctx, 1195, 748, "İstasyonlarda yolcu oluşmaya başladı.", 0.62, C.muted, gui.PIVOT_W)

    ui.panel(ctx, 345, 70, 530, 50, vmath.vector4(0.025, 0.085, 0.135, 0.92), C.border)
    ctx.hint_text = ui.text(ctx, 102, 70, "1. Bir istasyona basılı tut ve diğerine sürükle.", 0.55, C.muted, gui.PIVOT_W)
end

local function add_station_visual(ctx, station)
    station.glow = ui.circle(ctx, station.pos.x, station.pos.y, 34, vmath.vector4(0.12, 0.55, 1.0, 0.12))
    station.ring = ui.circle(ctx, station.pos.x, station.pos.y, 21, vmath.vector4(0.82, 0.93, 1.0, 0.95))
    station.core = ui.circle(ctx, station.pos.x, station.pos.y, 12, C.blue)
    station.queue_bg = ui.circle(ctx, station.pos.x + 16, station.pos.y - 15, 19, C.blue)
    station.queue_text = ui.text(ctx, station.pos.x + 16, station.pos.y - 15, "0", 0.42, C.white, gui.PIVOT_CENTER)
    gui.set_enabled(station.queue_bg, false)
    gui.set_enabled(station.queue_text, false)
    station.active_color = nil

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
    gui.set_rotation(train.root, vmath.quat_rotation_z(ui.design_angle(a.pos, b.pos)))
end

local function create_route_train(ctx, route)
    local first = route.stops[1]
    local color = theme.route_colors[route.color_index]
    local train = {
        route = route,
        i = 1,
        j = 2,
        t = 0,
        direction = 1,
        speed = 0.23 + (#ctx.trains % 3) * 0.025,
        dwell = 0.60,
        capacity = 18,
        onboard = 0,
    }

    local map_parent = ctx.parent
    train.root = ui.box(ctx, first.pos.x, first.pos.y, 1, 1, vmath.vector4(0, 0, 0, 0))
    ui.set_parent(ctx, train.root)

    train.glow = ui.circle(ctx, first.pos.x, first.pos.y, 30,
        vmath.vector4(color.x, color.y, color.z, 0.15))
    train.shadow = ui.box(ctx, first.pos.x + 1, first.pos.y - 3, 40, 17,
        vmath.vector4(0, 0, 0, 0.42))
    train.body = ui.box(ctx, first.pos.x, first.pos.y, 38, 14,
        vmath.vector4(0.82, 0.90, 0.96, 1.0))
    train.stripe = ui.box(ctx, first.pos.x, first.pos.y - 4, 34, 4, color)
    train.window = ui.box(ctx, first.pos.x - 3, first.pos.y + 2, 20, 5,
        vmath.vector4(0.035, 0.16, 0.24, 0.98))
    train.light = ui.circle(ctx, first.pos.x + 17, first.pos.y, 5, C.gold)

    ui.set_parent(ctx, map_parent)
    orient_train(train)
    table.insert(ctx.trains, train)

    local delivered = passenger_system.serve(first, train)
    simulation_system.record_delivery(ctx.simulation, delivered)
    gui.set_color(train.window, C.cyan)
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

    local edge = network_system.add_edge(ctx.network, last.id, station.id, route.color_index)
    if not edge then
        return false
    end

    local color = theme.route_colors[route.color_index]
    draw_route_segment(ctx, last, station, color)
    last.active_color = color
    station.active_color = color
    gui.set_color(last.core, color)
    gui.set_color(station.core, color)
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

local function advance_train(train, dt, simulation_speed)
    if train.dwell > 0 then
        train.dwell = math.max(0, train.dwell - dt * simulation_speed)
        return nil
    end

    train.t = train.t + dt * train.speed * simulation_speed
    if train.t < 1 then
        return nil
    end

    train.t = 0
    train.i = train.j
    local arrived = train.route.stops[train.i]

    if train.direction == 1 then
        if train.i >= #train.route.stops then
            train.direction = -1
            train.j = math.max(1, train.i - 1)
        else
            train.j = train.i + 1
        end
    else
        if train.i <= 1 then
            train.direction = 1
            train.j = math.min(#train.route.stops, 2)
        else
            train.j = train.i - 1
        end
    end

    train.dwell = 0.60
    orient_train(train)
    return arrived
end

local function update_station_queues(ctx)
    for _, station in ipairs(ctx.stations) do
        local waiting = math.floor(station.waiting or 0)
        local visible = waiting > 0
        gui.set_enabled(station.queue_bg, visible)
        gui.set_enabled(station.queue_text, visible)

        if visible then
            gui.set_text(station.queue_text, tostring(math.min(99, waiting)))
            local level = passenger_system.level(station)
            local color = C.blue
            if level == 2 then
                color = C.orange
            elseif level >= 3 then
                color = C.red
            end
            gui.set_color(station.queue_bg, color)
        end
    end

    local worst = passenger_system.worst_station(ctx.stations)
    if worst then
        local waiting = math.floor(worst.waiting or 0)
        local level = passenger_system.level(worst)
        if level >= 3 then
            gui.set_text(ctx.alert_title, "YOĞUNLUK KRİTİK")
            gui.set_color(ctx.alert_title, C.red)
        elseif level == 2 then
            gui.set_text(ctx.alert_title, "YOĞUNLUK ARTIYOR")
            gui.set_color(ctx.alert_title, C.orange)
        else
            gui.set_text(ctx.alert_title, "YOLCU TALEBİ")
            gui.set_color(ctx.alert_title, C.cyan)
        end
        gui.set_text(ctx.alert_body, worst.name .. ": " .. waiting .. " yolcu bekliyor.")
    end
end

local function show_completion(ctx, connected)
    if ctx.completed then return end
    ctx.completed = true
    ctx.simulation.paused = true
    ctx.simulation.metro_coin = ctx.simulation.metro_coin + 250

    local map_parent = ctx.parent
    ui.set_parent(ctx, nil)

    ui.box(ctx, 800, 450, 1600, 900, vmath.vector4(0.0, 0.015, 0.035, 0.72))
    ui.panel(ctx, 800, 455, 560, 385, vmath.vector4(0.025, 0.085, 0.14, 0.985), C.cyan)
    ui.text(ctx, 800, 575, "IST-01 TAMAMLANDI", 1.65, C.white, gui.PIVOT_CENTER)
    ui.text(ctx, 800, 528, "İlk Hat", 0.92, C.cyan, gui.PIVOT_CENTER)
    ui.box(ctx, 800, 497, 420, 2, vmath.vector4(0.25, 0.78, 1.0, 0.42))

    ui.text(ctx, 650, 458, "Bağlı istasyon", 0.70, C.muted, gui.PIVOT_W)
    ui.text(ctx, 950, 458, tostring(connected), 0.88, C.white, gui.PIVOT_E)
    ui.text(ctx, 650, 420, "Kurulan hat", 0.70, C.muted, gui.PIVOT_W)
    ui.text(ctx, 950, 420, tostring(#ctx.routes), 0.88, C.white, gui.PIVOT_E)
    ui.text(ctx, 650, 382, "Taşınan yolcu", 0.70, C.muted, gui.PIVOT_W)
    ui.text(ctx, 950, 382, format_int(ctx.simulation.passengers), 0.88, C.white, gui.PIVOT_E)

    ui.panel(ctx, 800, 325, 390, 62, vmath.vector4(0.06, 0.16, 0.20, 0.96), C.green)
    ui.text(ctx, 690, 325, "BÖLÜM ÖDÜLÜ", 0.68, C.muted, gui.PIVOT_W)
    ui.text(ctx, 925, 325, "+250 Metro Coin", 0.92, C.gold, gui.PIVOT_E)

    ctx.buttons.complete_home = ui.button(ctx, 800, 245, 300, 58,
        "ANA MENÜYE DÖN", C.blue, C.cyan, C.white, 0.90)

    ui.set_parent(ctx, map_parent)
end

local function update_hud(ctx)
    local connected = network_system.connected_count(ctx.network)
    local sim = ctx.simulation
    local passenger_goal = 25

    if connected < 5 then
        gui.set_text(ctx.goal_text, "5 istasyonu bağla  " .. connected .. "/5")
        gui.set_color(ctx.goal_text, C.white)

        if #ctx.routes == 0 then
            gui.set_text(ctx.hint_text, "1. Bir istasyona basılı tut ve diğerine sürükle.")
        elseif connected < 3 then
            gui.set_text(ctx.hint_text, "2. Aynı sürüklemede birkaç istasyonun üzerinden geçebilirsin.")
        else
            gui.set_text(ctx.hint_text, "3. Ağ için " .. math.max(0, 5 - connected) .. " istasyon daha bağla.")
        end
    elseif sim.passengers < passenger_goal then
        gui.set_text(ctx.goal_text, "25 yolcu taşı  " .. math.min(passenger_goal, math.floor(sim.passengers)) .. "/25")
        gui.set_color(ctx.goal_text, C.cyan)
        gui.set_text(ctx.hint_text, "Trenler durakta bekler, yolcu alır ve bir sonraki durakta indirir.")
    else
        gui.set_text(ctx.goal_text, "HEDEF TAMAMLANDI")
        gui.set_color(ctx.goal_text, C.green)
        gui.set_text(ctx.hint_text, "Harika. İstanbul'daki ilk hattın yolcu taşımaya başladı.")
        show_completion(ctx, connected)
    end

    local waiting = math.floor(passenger_system.total_waiting(ctx.stations))
    gui.set_text(ctx.budget_text, "TL  " .. format_int(sim.budget))
    gui.set_text(ctx.approval_text, string.format("Memnuniyet %d", math.floor(sim.approval)))
    gui.set_text(ctx.passenger_text, "Taşınan " .. format_int(sim.passengers))
    gui.set_text(ctx.route_text, "Hat " .. tostring(#ctx.routes) .. " / Bekleyen " .. waiting)
    gui.set_text(ctx.date_text, string.format("%d / %02d", sim.year, sim.month))
    update_station_queues(ctx)
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
    ctx.pan_drag = nil
    ctx.hud_clock = 0
    ctx.anim_clock = 0
    ctx.completed = false
    ctx.camera = { zoom = 1.0, pan_x = 0, pan_y = 0 }

    ui.set_parent(ctx, nil)
    ui.box(ctx, 800, 450, 1600, 900, C.land)

    -- Everything geographic lives below one transform root. This makes pan/zoom
    -- independent from simulation and HUD state.
    ctx.map_root = ui.box(ctx, 800, 450, 1, 1, vmath.vector4(0, 0, 0, 0))
    ui.set_parent(ctx, ctx.map_root)

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
    passenger_system.attach(ctx.stations)

    ui.set_parent(ctx, nil)
    add_hud(ctx)
    apply_camera(ctx)

    -- Dynamic route previews and trains are map children too.
    ui.set_parent(ctx, ctx.map_root)
end

function M.update(ctx, dt)
    simulation_system.update(ctx.simulation, dt, #ctx.network.edges)
    ctx.anim_clock = ctx.anim_clock + dt

    if not ctx.simulation.paused then
        passenger_system.update(ctx.stations, dt, ctx.simulation.speed)
    end

    for index, station in ipairs(ctx.stations) do
        local demand = math.min(1, (station.waiting or 0) / math.max(1, station.capacity or 22))
        local pulse = 1.0 + (0.08 + demand * 0.18) * math.sin(ctx.anim_clock * (2.2 + demand * 2.0) + index * 0.55)
        gui.set_scale(station.glow, vmath.vector3(pulse, pulse, 1))

        if demand >= 0.72 then
            gui.set_color(station.glow, vmath.vector4(C.red.x, C.red.y, C.red.z, 0.20))
        elseif demand >= 0.40 then
            gui.set_color(station.glow, vmath.vector4(C.orange.x, C.orange.y, C.orange.z, 0.17))
        elseif station.active_color then
            local color = station.active_color
            gui.set_color(station.glow, vmath.vector4(color.x, color.y, color.z, 0.15))
        end
    end

    if not ctx.simulation.paused then
        local speed = ctx.simulation.speed
        for _, train in ipairs(ctx.trains) do
            local arrived = advance_train(train, dt, speed)
            if arrived then
                local delivered, boarded = passenger_system.serve(arrived, train)
                simulation_system.record_delivery(ctx.simulation, delivered)
                gui.set_color(train.window, C.cyan)
            elseif train.dwell <= 0 then
                gui.set_color(train.window, vmath.vector4(0.035, 0.16, 0.24, 0.98))
            end

            local a = train.route.stops[train.i]
            local b = train.route.stops[train.j]
            local pos = geom.lerp(a.pos, b.pos, train.t)
            ui.set_map_position(train.root, pos)
        end
    end

    ctx.hud_clock = ctx.hud_clock + dt
    if ctx.hud_clock > 0.15 then
        ctx.hud_clock = 0
        update_hud(ctx)
    end
end

function M.on_input(ctx, action)
    if ctx.completed then
        if action.released and ui.hit(ctx.buttons.complete_home, action.x, action.y) then
            return "home"
        end
        return nil
    end

    if action.released and ui.hit(ctx.buttons.home, action.x, action.y) then
        delete_preview(ctx)
        ctx.route_draft = nil
        ctx.pan_drag = nil
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

    if action.released and ui.hit(ctx.buttons.zoom_out, action.x, action.y) then
        ctx.camera.zoom = clamp(ctx.camera.zoom - 0.15, 0.85, 1.65)
        apply_camera(ctx)
        return nil
    end
    if action.released and ui.hit(ctx.buttons.zoom_in, action.x, action.y) then
        ctx.camera.zoom = clamp(ctx.camera.zoom + 0.15, 0.85, 1.65)
        apply_camera(ctx)
        return nil
    end

    local pointer = screen_to_map(ctx, action.x, action.y)

    if action.pressed then
        if is_ui_zone(action.x, action.y) then
            return nil
        end

        local station = find_station(ctx, pointer.x, pointer.y, map_hit_radius(ctx, 36))
        if station then
            begin_route(ctx, station, pointer)
        else
            ctx.pan_drag = {
                start_x = action.x,
                start_y = action.y,
                pan_x = ctx.camera.pan_x,
                pan_y = ctx.camera.pan_y,
            }
        end
        return nil
    end

    if ctx.route_draft and not action.released then
        local station = find_station(ctx, pointer.x, pointer.y, map_hit_radius(ctx, 31))
        if station then
            append_station(ctx, station)
        end
        local last = ctx.route_draft.stops[#ctx.route_draft.stops]
        set_preview(ctx, last.pos, pointer, ctx.route_draft.color_index)
        return nil
    end

    if ctx.pan_drag and not action.released then
        ctx.camera.pan_x = clamp(ctx.pan_drag.pan_x + (action.x - ctx.pan_drag.start_x), -330, 330)
        ctx.camera.pan_y = clamp(ctx.pan_drag.pan_y + (action.y - ctx.pan_drag.start_y), -210, 210)
        apply_camera(ctx)
        return nil
    end

    if action.released and ctx.route_draft then
        local station = find_station(ctx, pointer.x, pointer.y, map_hit_radius(ctx, 40))
        if station then
            append_station(ctx, station)
        end
        finish_route(ctx)
        update_hud(ctx)
        return nil
    end

    if action.released and ctx.pan_drag then
        ctx.pan_drag = nil
        return nil
    end

    return nil
end

function M.cancel_drag(ctx)
    delete_preview(ctx)
    ctx.route_draft = nil
end

return M
