local ui = require "ui.ui_factory"
local theme = require "core.theme"

local M = {}
local C = theme.colors

local function add_city_lights(ctx)
    math.randomseed(29092026)
    for i = 1, 130 do
        local x = math.random(180, 1580)
        local y = math.random(90, 745)
        local s = math.random(2, 5)
        local col = (i % 5 == 0) and C.city_light_cool or C.city_light
        ui.box(ctx, x, y, s, s, col)
    end
end

local function add_bridge(ctx)
    local a = vmath.vector3(850, 290, 0)
    local b = vmath.vector3(1450, 370, 0)
    ui.neon_line(ctx, a, b, 5, C.red, vmath.vector4(1, 0.08, 0.12, 0.18))
    for x = 930, 1380, 150 do
        ui.line(ctx, vmath.vector3(x, 300 + (x - 850) * 0.133, 0), vmath.vector3(x, 520, 0), 3, vmath.vector4(1, 0.18, 0.20, 0.65))
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
