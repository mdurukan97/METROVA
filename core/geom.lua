local M = {}

function M.distance(a, b)
    local dx = b.x - a.x
    local dy = b.y - a.y
    return math.sqrt(dx * dx + dy * dy)
end

function M.lerp(a, b, t)
    return vmath.vector3(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        0
    )
end

function M.atan2(y, x)
    if math.atan2 then
        return math.atan2(y, x)
    end
    if x > 0 then
        return math.atan(y / x)
    elseif x < 0 and y >= 0 then
        return math.atan(y / x) + math.pi
    elseif x < 0 and y < 0 then
        return math.atan(y / x) - math.pi
    elseif x == 0 and y > 0 then
        return math.pi / 2
    elseif x == 0 and y < 0 then
        return -math.pi / 2
    end
    return 0
end

function M.hit_rect(rect, x, y)
    return x >= rect.x - rect.w / 2
       and x <= rect.x + rect.w / 2
       and y >= rect.y - rect.h / 2
       and y <= rect.y + rect.h / 2
end

return M
