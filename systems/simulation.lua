local M = {}

function M.new()
    return {
        budget = 1245000,
        yearly_income = 52300,
        metro_coin = 312450,
        approval = 74,
        year = 2028,
        month = 4,
        passengers = 0,
        fare = 22,
        paused = false,
        speed = 1,
        clock = 0,
    }
end

function M.set_speed(sim, speed)
    sim.speed = speed
    sim.paused = false
end

function M.toggle_pause(sim)
    sim.paused = not sim.paused
end

function M.update(sim, dt, active_routes)
    if sim.paused then
        return
    end

    local scaled = dt * sim.speed
    sim.clock = sim.clock + scaled
    if sim.clock >= 15 then
        sim.clock = sim.clock - 15
        sim.month = sim.month + 1
        sim.budget = sim.budget + math.floor(sim.yearly_income / 12)
        if sim.month > 12 then
            sim.month = 1
            sim.year = sim.year + 1
        end
    end
end

function M.record_delivery(sim, count)
    if not count or count <= 0 then
        return
    end
    sim.passengers = sim.passengers + count
    sim.budget = sim.budget + count * sim.fare
    sim.approval = math.min(100, sim.approval + count * 0.01)
end

return M
