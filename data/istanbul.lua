local M = {}

-- v0.1 vertical slice: intentionally curated positions rather than GIS-accurate data.
-- The next map milestone replaces these with projected geographic coordinates.
M.stations = {
    { id = "kucukcekmece", name = "Kucukcekmece", x = 170,  y = 310, side = "eu" },
    { id = "bagcilar",      name = "Bagcilar",      x = 360,  y = 370, side = "eu" },
    { id = "bakirkoy",      name = "Bakirkoy",      x = 430,  y = 245, side = "eu" },
    { id = "fatih",         name = "Fatih",         x = 590,  y = 330, side = "eu" },
    { id = "yenikapi",      name = "Yenikapi",      x = 650,  y = 280, side = "eu" },
    { id = "taksim",        name = "Taksim",        x = 760,  y = 500, side = "eu" },
    { id = "sisli",         name = "Sisli",         x = 700,  y = 610, side = "eu" },
    { id = "mecidiyekoy",   name = "Mecidiyekoy",   x = 640,  y = 650, side = "eu" },
    { id = "kagithane",     name = "Kagithane",     x = 690,  y = 720, side = "eu" },
    { id = "uskudar",       name = "Uskudar",       x = 1060, y = 520, side = "asia" },
    { id = "kadikoy",       name = "Kadikoy",       x = 1130, y = 450, side = "asia" },
    { id = "bostanci",      name = "Bostanci",      x = 1260, y = 370, side = "asia" },
    { id = "maltepe",       name = "Maltepe",       x = 1370, y = 330, side = "asia" },
    { id = "kartal",        name = "Kartal",        x = 1470, y = 295, side = "asia" },
}

M.water_segments = {
    { a = vmath.vector3(845, 760, 0), b = vmath.vector3(865, 650, 0), width = 150 },
    { a = vmath.vector3(865, 650, 0), b = vmath.vector3(900, 560, 0), width = 165 },
    { a = vmath.vector3(900, 560, 0), b = vmath.vector3(915, 455, 0), width = 175 },
    { a = vmath.vector3(915, 455, 0), b = vmath.vector3(900, 330, 0), width = 190 },
    { a = vmath.vector3(900, 330, 0), b = vmath.vector3(880, 190, 0), width = 220 },
}

M.halic_segments = {
    { a = vmath.vector3(870, 510, 0), b = vmath.vector3(790, 490, 0), width = 80 },
    { a = vmath.vector3(790, 490, 0), b = vmath.vector3(700, 450, 0), width = 72 },
    { a = vmath.vector3(700, 450, 0), b = vmath.vector3(610, 420, 0), width = 62 },
}

return M
