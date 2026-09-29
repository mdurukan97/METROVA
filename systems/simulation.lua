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
    sim.passengers = sim.passengers + scaled * math.max(1, active_routes) * 0.55

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

return M
