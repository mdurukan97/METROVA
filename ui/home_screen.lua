local ui = require "ui.ui_factory"
local theme = require "core.theme"

local M = {}
local C = theme.colors

local function add_city_lights(ctx)
    math.randomseed(29092026)

    -- Dense lower-city glow instead of a star-field spread across the whole screen.
    for i = 1, 210 do
        local x = math.random(190, 1580)
        local y = math.random(225, 500)
        local s = math.random(2, 5)
        local col = (i % 6 == 0) and C.city_light_cool or C.city_light
        ui.box(ctx, x, y, s, s, col)
    end

    -- A restrained skyline silhouette.
    local x = 690
    while x < 1580 do
        local w = math.random(18, 42)
        local h = math.random(45, 170)
        ui.box(ctx, x, 310 + h * 0.5, w, h, vmath.vector4(0.018, 0.055, 0.09, 0.96))
        if h > 115 then
            ui.box(ctx, x, 310 + h + 18, 3, 36, vmath.vector4(0.12, 0.28, 0.42, 0.8))
        end
        x = x + w + math.random(7, 18)
    end
end

local function add_bridge(ctx)
    -- Water foreground.
    ui.box(ctx, 1115, 215, 930, 250, vmath.vector4(0.018, 0.095, 0.16, 0.82))

    -- Main illuminated bridge deck, built as a segmented curve.
    local pts = {
        vmath.vector3(765, 330, 0),
        vmath.vector3(855, 342, 0),
        vmath.vector3(955, 352, 0),
        vmath.vector3(1065, 360, 0),
        vmath.vector3(1180, 366, 0),
        vmath.vector3(1300, 369, 0),
        vmath.vector3(1435, 365, 0),
        vmath.vector3(1545, 354, 0),
    }
    for i = 1, #pts - 1 do
        ui.neon_line(ctx, pts[i], pts[i + 1], 4.2, C.red, vmath.vector4(1, 0.08, 0.12, 0.16))
    end

    local towers = {
        { x = 930, deck = 350, top = 570 },
        { x = 1355, deck = 368, top = 570 },
    }
    for _, tower in ipairs(towers) do
        ui.neon_line(ctx, vmath.vector3(tower.x, tower.deck, 0), vmath.vector3(tower.x, tower.top, 0), 4, C.red, vmath.vector4(1, 0.08, 0.12, 0.12))
        ui.neon_line(ctx, vmath.vector3(tower.x + 22, tower.deck, 0), vmath.vector3(tower.x + 22, tower.top, 0), 4, C.red, vmath.vector4(1, 0.08, 0.12, 0.12))
    end

    -- Suspension cables.
    local cable = vmath.vector4(1, 0.24, 0.27, 0.62)
    for _, px in ipairs({800, 850, 1015, 1080, 1160, 1240, 1420, 1490}) do
        local target_y = 340 + math.abs(px - 1140) * 0.022
        local topx = px < 1140 and 941 or 1366
        ui.line(ctx, vmath.vector3(topx, 560, 0), vmath.vector3(px, target_y, 0), 1.6, cable)
    end
end

function M.build(ctx)
    ctx.buttons = {}
    ctx.screen = "home"

    ui.box(ctx, 800, 450, 1600, 900, C.bg_deep)
    ui.box(ctx, 910, 405, 1380, 810, vmath.vector4(0.025, 0.07, 0.12, 1))
    add_city_lights(ctx)
    add_bridge(ctx)

    -- Left navigation
    ui.box(ctx, 86, 450, 172, 900, vmath.vector4(0.015, 0.045, 0.078, 0.98))
    ui.button(ctx, 86, 845, 150, 52, "ANA SAYFA", C.panel_hover, C.blue, C.white, 1.05)
    ui.text(ctx, 58, 777, "SEHIRLER", 0.98, C.muted, gui.PIVOT_W)
    ui.text(ctx, 58, 715, "KARIYER", 0.98, C.muted, gui.PIVOT_W)
    ui.text(ctx, 58, 653, "GARAJ", 0.98, C.muted, gui.PIVOT_W)
    ui.text(ctx, 58, 591, "MARKET", 0.98, C.muted, gui.PIVOT_W)
    ui.text(ctx, 58, 529, "AYARLAR", 0.98, C.muted, gui.PIVOT_W)
    ui.text(ctx, 31, 34, "MHDRN STUDYOSU  v0.1", 0.72, C.muted, gui.PIVOT_W)

    -- Brand and account bar
    ui.text(ctx, 220, 838, "METROVA", 3.25, C.white, gui.PIVOT_W)
    ui.text(ctx, 222, 785, "SEHRIN NABZINI RAYLARLA YONET", 0.92, C.muted, gui.PIVOT_W)
    ui.panel(ctx, 1180, 845, 220, 58, C.panel, C.border)
    ui.text(ctx, 1095, 845, "312,450", 1.15, C.white, gui.PIVOT_W)
    ui.text(ctx, 1180, 822, "Metro Coin", 0.67, C.muted, gui.PIVOT_CENTER)
    ui.panel(ctx, 1410, 845, 270, 58, C.panel, C.border)
    ui.text(ctx, 1310, 857, "Muhammed D.", 0.90, C.white, gui.PIVOT_W)
    ui.text(ctx, 1310, 833, "Seviye 8", 0.67, C.muted, gui.PIVOT_W)

    -- Resume card
    ui.panel(ctx, 400, 630, 395, 118, C.panel, C.border)
    ui.text(ctx, 250, 664, "ISTANBUL", 1.48, C.white, gui.PIVOT_W)
    ui.text(ctx, 250, 630, "IST-01  -  Ilk Hat", 0.92, C.muted, gui.PIVOT_W)
    ui.text(ctx, 250, 600, "Sehrindeki ilk metro hattini kur.", 0.78, C.muted, gui.PIVOT_W)
    ctx.buttons.continue = ui.button(ctx, 400, 520, 395, 70, ">  DEVAM ET", C.blue, vmath.vector4(0.1, 0.65, 1, 1), C.white, 1.35)
    ui.text(ctx, 400, 487, "Istanbul  -  IST-01", 0.72, C.muted, gui.PIVOT_CENTER)

    -- Feature cards
    local cards = {
        { 315, "KARIYER", "Bolumler - Sehirler - Hedefler" },
        { 575, "GARAJ", "Tren Modelleri - Ozellestirme" },
        { 835, "YETENEKLER", "Kalici Gelisim - Pasif Bonuslar" },
        { 1095, "MARKET", "Metro Coin - Tema - Icerik" },
    }
    for _, card in ipairs(cards) do
        ui.panel(ctx, card[1], 120, 235, 98, C.panel_soft, C.border)
        ui.text(ctx, card[1] - 92, 140, card[2], 1.0, C.white, gui.PIVOT_W)
        ui.text(ctx, card[1] - 92, 108, card[3], 0.62, C.muted, gui.PIVOT_W)
    end

    ui.panel(ctx, 1408, 120, 315, 98, C.panel, C.border)
    ui.text(ctx, 1280, 145, "GUNLUK GOREV", 0.92, C.cyan, gui.PIVOT_W)
    ui.text(ctx, 1280, 114, "Bugun 500 yolcu tasi", 0.72, C.white, gui.PIVOT_W)
    ui.text(ctx, 1490, 114, "0 / 500", 0.72, C.muted, gui.PIVOT_E)
    ui.box(ctx, 1400, 86, 220, 9, vmath.vector4(0.07, 0.16, 0.24, 1))
end

function M.on_input(ctx, action)
    if not action.released then
        return nil
    end
    if ui.hit(ctx.buttons.continue, action.x, action.y) then
        return "game"
    end
    return nil
end

return M
