local M = {}

function M.new()
    return {
        edges = {},
        connected = {},
        next_color = 1,
    }
end

local function edge_key(a, b)
    if a < b then
        return a .. "::" .. b
    end
    return b .. "::" .. a
end

function M.has_edge(network, a, b)
    local key = edge_key(a, b)
    for _, edge in ipairs(network.edges) do
        if edge.key == key then
            return true
        end
    end
    return false
end

function M.add_edge(network, a, b, color_index)
    if a == b or M.has_edge(network, a, b) then
        return nil
    end
    local edge = {
        key = edge_key(a, b),
        a = a,
        b = b,
        color_index = color_index,
    }
    table.insert(network.edges, edge)
    network.connected[a] = true
    network.connected[b] = true
    return edge
end

function M.connected_count(network)
    local n = 0
    for _ in pairs(network.connected) do
        n = n + 1
    end
    return n
end

return M
