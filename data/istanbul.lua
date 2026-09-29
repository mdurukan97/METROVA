local geo = require "core.geo"

local M = {}

M.bounds = {
    min_lon = 28.66,
    max_lon = 29.34,
    min_lat = 40.86,
    max_lat = 41.20,
}

M.viewport = {
    x_min = 95,
    x_max = 1545,
    y_min = 95,
    y_max = 790,
}

local function P(lon, lat)
    return geo.project(lon, lat, M.bounds, M.viewport)
end

local function station(id, name, lon, lat, side)
    local p = P(lon, lat)
    return {
        id = id,
        name = name,
        lon = lon,
        lat = lat,
        x = p.x,
        y = p.y,
        side = side,
    }
end

M.stations = {
    station("kucukcekmece", "Küçükçekmece", 28.776, 40.994, "eu"),
    station("basaksehir", "Başakşehir", 28.806, 41.107, "eu"),
    station("bagcilar", "Bağcılar", 28.856, 41.034, "eu"),
    station("bakirkoy", "Bakırköy", 28.872, 40.980, "eu"),
    station("fatih", "Fatih", 28.949, 41.018, "eu"),
    station("yenikapi", "Yenikapı", 28.953, 41.005, "eu"),
    station("beyoglu", "Beyoğlu", 28.974, 41.037, "eu"),
    station("taksim", "Taksim", 28.986, 41.037, "eu"),
    station("sisli", "Şişli", 28.987, 41.060, "eu"),
    station("mecidiyekoy", "Mecidiyeköy", 29.003, 41.067, "eu"),
    station("kagithane", "Kağıthane", 28.971, 41.083, "eu"),
    station("besiktas", "Beşiktaş", 29.004, 41.043, "eu"),
    station("levent", "Levent", 29.014, 41.082, "eu"),
    station("uskudar", "Üsküdar", 29.015, 41.025, "asia"),
    station("kadikoy", "Kadıköy", 29.023, 40.991, "asia"),
    station("umraniye", "Ümraniye", 29.124, 41.016, "asia"),
    station("atasehir", "Ataşehir", 29.124, 40.984, "asia"),
    station("bostanci", "Bostancı", 29.092, 40.956, "asia"),
    station("maltepe", "Maltepe", 29.137, 40.935, "asia"),
    station("kartal", "Kartal", 29.187, 40.889, "asia"),
    station("pendik", "Pendik", 29.230, 40.878, "asia"),
    station("sabiha", "Sabiha Gökçen", 29.309, 40.899, "asia"),
}

M.bosphorus = {
    points = geo.path({
        {29.070, 41.195},
        {29.067, 41.165},
        {29.056, 41.130},
        {29.055, 41.100},
        {29.050, 41.075},
        {29.040, 41.052},
        {29.028, 41.032},
        {29.005, 41.014},
        {29.000, 40.992},
    }, M.bounds, M.viewport),
    width = 58,
}

M.halic = {
    points = geo.path({
        {28.990, 41.020},
        {28.975, 41.027},
        {28.960, 41.036},
        {28.944, 41.043},
        {28.927, 41.049},
    }, M.bounds, M.viewport),
    width = 30,
}

M.kucukcekmece_lake = {
    center = P(28.742, 41.005),
    diameter = 88,
}

M.coastlines = {
    geo.path({
        {28.685, 40.985}, {28.730, 40.985}, {28.776, 40.992},
        {28.825, 40.982}, {28.872, 40.980}, {28.915, 40.992},
        {28.953, 41.006}, {28.979, 41.015}, {28.996, 41.030},
        {29.010, 41.047}, {29.025, 41.062}, {29.037, 41.085},
        {29.046, 41.110}, {29.052, 41.140}, {29.058, 41.175},
        {29.060, 41.198},
    }, M.bounds, M.viewport),

    geo.path({
        {29.082, 41.198}, {29.086, 41.170}, {29.091, 41.140},
        {29.088, 41.110}, {29.076, 41.085}, {29.061, 41.065},
        {29.047, 41.047}, {29.030, 41.031}, {29.016, 41.018},
        {29.021, 40.998}, {29.045, 40.982}, {29.074, 40.965},
        {29.105, 40.950}, {29.140, 40.935}, {29.178, 40.910},
        {29.220, 40.888}, {29.265, 40.879}, {29.320, 40.885},
    }, M.bounds, M.viewport),

    geo.path({
        {28.990, 41.021}, {28.973, 41.031}, {28.957, 41.040},
        {28.940, 41.048}, {28.923, 41.052},
    }, M.bounds, M.viewport),

    geo.path({
        {28.989, 41.015}, {28.973, 41.020}, {28.957, 41.028},
        {28.943, 41.036}, {28.926, 41.043},
    }, M.bounds, M.viewport),
}

M.roads = {
    geo.path({
        {28.74, 41.00}, {28.82, 41.02}, {28.90, 41.02}, {28.96, 41.04}, {29.02, 41.06},
    }, M.bounds, M.viewport),
    geo.path({
        {28.85, 40.98}, {28.94, 41.00}, {29.02, 40.99}, {29.10, 40.96}, {29.20, 40.89}, {29.30, 40.90},
    }, M.bounds, M.viewport),
    geo.path({
        {28.97, 41.08}, {29.00, 41.07}, {29.04, 41.05}, {29.12, 41.02}, {29.18, 40.99},
    }, M.bounds, M.viewport),
}

M.bridges = {
    { name = "15 Temmuz Şehitler Köprüsü", a = P(29.030, 41.045), b = P(29.054, 41.045) },
    { name = "FSM Köprüsü", a = P(29.055, 41.092), b = P(29.072, 41.092) },
    { name = "YSS Köprüsü", a = P(29.075, 41.177), b = P(29.089, 41.177) },
}

M.labels = {
    { text = "İSTANBUL BOĞAZI", pos = P(29.047, 41.065), angle = 82 },
    { text = "HALİÇ", pos = P(28.955, 41.038), angle = 18 },
    { text = "MARMARA DENİZİ", pos = P(29.050, 40.890), angle = 0 },
}

return M
