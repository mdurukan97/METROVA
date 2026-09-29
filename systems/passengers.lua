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

local function route_has(route, station_id)
    if not route or not route.stops then
        return false
    end
    for _, stop in ipairs(route.stops) do
        if stop.id == station_id then
            return true
        end
    end
    return false
end

local function shares_route(a, b)
    for route_id in pairs(a.routes or {}) do
        if b.routes and b.routes[route_id] then
            return true
        end
    end
    return false
end

local function choose_destination(stations, station)
    local count = #stations
    if count <= 1 then
        return nil
    end

    local cursor = station.destination_cursor or 1
    for _ = 1, count do
        cursor = cursor + 1
        if cursor > count then cursor = 1 end
        local candidate = stations[cursor]
        if candidate.id ~= station.id and shares_route(station, candidate) then
            station.destination_cursor = cursor
            return candidate
        end
    end
    return nil
end

function M.attach(stations)
    for index, station in ipairs(stations) do
        station.waiting = 0
        station.queue = {}
        station.spawn_credit = ((index * 7) % 10) / 10
        station.destination_cursor = ((index * 5) % math.max(1, #stations)) + 1
        station.demand_rate = DEMAND[station.id] or 0.7
        station.capacity = 22
        station.routes = {}
        station.critical_time = 0
        station.max_critical_time = 14
    end
end

function M.update(stations, dt, speed)
    local scaled = dt * (speed or 1)
    local failed_station = nil

    for _, station in ipairs(stations) do
        local service_factor = station.active_color and 1.0 or 0.0
        station.spawn_credit = station.spawn_credit + scaled * station.demand_rate * 0.44 * service_factor

        local spawn_guard = 0
        while station.spawn_credit >= 1 and spawn_guard < 8 do
            station.spawn_credit = station.spawn_credit - 1
            local destination = choose_destination(stations, station)
            if destination then
                station.queue[destination.id] = (station.queue[destination.id] or 0) + 1
                station.waiting = station.waiting + 1
            end
            spawn_guard = spawn_guard + 1
        end

        if station.active_color and station.waiting >= station.capacity then
            station.critical_time = station.critical_time + scaled
            if station.critical_time >= station.max_critical_time and not failed_station then
                failed_station = station
            end
        else
            station.critical_time = math.max(0, station.critical_time - scaled * 0.8)
        end
    end

    return failed_station
end

function M.serve(station, train)
    if not station or not train then
        return 0, 0
    end

    train.onboard_by_destination = train.onboard_by_destination or {}
    train.onboard = train.onboard or 0

    local delivered = train.onboard_by_destination[station.id] or 0
    if delivered > 0 then
        train.onboard_by_destination[station.id] = nil
        train.onboard = math.max(0, train.onboard - delivered)
    end

    local free = math.max(0, (train.capacity or 18) - train.onboard)
    local boarded = 0

    if free > 0 and station.queue then
        for _, destination in ipairs(train.route.stops or {}) do
            if free <= 0 then break end
            if destination.id ~= station.id then
                local waiting_for_destination = station.queue[destination.id] or 0
                if waiting_for_destination > 0 and route_has(train.route, destination.id) then
                    local take = math.min(waiting_for_destination, free)
                    station.queue[destination.id] = waiting_for_destination - take
                    if station.queue[destination.id] <= 0 then
                        station.queue[destination.id] = nil
                    end

                    train.onboard_by_destination[destination.id] =
                        (train.onboard_by_destination[destination.id] or 0) + take
                    train.onboard = train.onboard + take
                    station.waiting = math.max(0, station.waiting - take)
                    boarded = boarded + take
                    free = free - take
                end
            end
        end
    end

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

function M.top_destination(station, station_index)
    if not station or not station.queue then
        return nil, 0
    end

    local best_id = nil
    local best_count = 0
    for destination_id, count in pairs(station.queue) do
        if count > best_count then
            best_id = destination_id
            best_count = count
        end
    end

    if best_id and station_index and station_index[best_id] then
        return station_index[best_id], best_count
    end
    return nil, 0
end

function M.level(station)
    local waiting = station and station.waiting or 0
    local capacity = station and station.capacity or 22
    local ratio = waiting / math.max(1, capacity)

    if ratio >= 1.0 then return 3 end
    if ratio >= 0.58 then return 2 end
    if waiting >= 1 then return 1 end
    return 0
end

function M.critical_progress(station)
    if not station then return 0 end
    return math.min(1, (station.critical_time or 0) / math.max(1, station.max_critical_time or 14))
end

return M
