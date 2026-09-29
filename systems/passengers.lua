local M = {}

local DEMAND = {
    kucukcekmece = 0.55,
    basaksehir = 0.38,
    bagcilar = 0.72,
    bakirkoy = 0.82,
    fatih = 0.92,
    yenikapi = 1.22,
    beyoglu = 0.95,
    taksim = 1.36,
    sisli = 1.02,
    mecidiyekoy = 1.24,
    kagithane = 0.72,
    besiktas = 1.12,
    levent = 1.18,
    uskudar = 1.16,
    kadikoy = 1.38,
    umraniye = 0.92,
    atasehir = 1.02,
    bostanci = 0.88,
    maltepe = 0.72,
    kartal = 0.62,
    pendik = 0.58,
    sabiha = 0.80,
}

function M.attach(stations)
    for index, station in ipairs(stations) do
        station.waiting = ((index * 3) % 5) * 0.45
        station.demand_rate = DEMAND[station.id] or 0.7
        station.capacity = 22
    end
end

function M.update(stations, dt, speed)
    local scaled = dt * (speed or 1)
    for _, station in ipairs(stations) do
        local pressure = station.active_color and 1.08 or 1.0
        station.waiting = math.min(
            station.capacity,
            station.waiting + scaled * station.demand_rate * 0.32 * pressure
        )
    end
end

function M.serve(station, train)
    if not station or not train then
        return 0, 0
    end

    local delivered = math.min(train.onboard or 0, math.max(0, math.floor((train.onboard or 0) * 0.55)))
    train.onboard = math.max(0, (train.onboard or 0) - delivered)

    local free = math.max(0, (train.capacity or 18) - train.onboard)
    local boarded = math.min(math.floor(station.waiting or 0), free)
    station.waiting = math.max(0, (station.waiting or 0) - boarded)
    train.onboard = train.onboard + boarded

    return delivered, boarded
end

function M.total_waiting(stations)
    local total = 0
    for _, station in ipairs(stations) do
        total = total + (station.waiting or 0)
    end
    return total
end

function M.worst_station(stations)
    local worst = nil
    for _, station in ipairs(stations) do
        if not worst or (station.waiting or 0) > (worst.waiting or 0) then
            worst = station
        end
    end
    return worst
end

function M.level(station)
    local waiting = station and station.waiting or 0
    if waiting >= 16 then return 3 end
    if waiting >= 9 then return 2 end
    if waiting >= 1 then return 1 end
    return 0
end

return M
