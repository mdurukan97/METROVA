local M = {}

function M.project(lon, lat, bounds, viewport)
    local nx = (lon - bounds.min_lon) / (bounds.max_lon - bounds.min_lon)
    local ny = (lat - bounds.min_lat) / (bounds.max_lat - bounds.min_lat)
    return vmath.vector3(
        viewport.x_min + nx * (viewport.x_max - viewport.x_min),
        viewport.y_min + ny * (viewport.y_max - viewport.y_min),
        0
    )
end

function M.path(points, bounds, viewport)
    local out = {}
    for _, p in ipairs(points) do
        table.insert(out, M.project(p[1], p[2], bounds, viewport))
    end
    return out
end

return M
