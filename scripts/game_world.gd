extends Node2D

signal state_changed(state: Dictionary)
signal selection_changed(kind: String, index: int, station_id: String)
signal action_message(text: String)

const UI = preload("res://scripts/ui_style.gd")
const DB = preload("res://scripts/level_db.gd")

var level: Dictionary = {}
var stations: Dictionary = {}
var lines: Array = []
var budget := 0.0
var initial_budget := 0.0
var delivered := 0
var satisfaction := 100.0
var avg_wait := 0.0
var projected_net := 0.0
var tunnel_count := 0
var undo_used := false
var emergency_used := false
var extension_commits := 0
var transfer_upgrades := {}
var paused := false
var speed := 1.0

var selected_line := -1
var selected_station := ""
var drag_station := ""
var drag_pos := Vector2.ZERO
var drag_active := false
var drag_moved := false

var undo_snapshot: Dictionary = {}
var undo_deadline := 0.0
var spawn_accum := 0.0
var hud_accum := 0.0
var sim_time := 0.0
var next_line_id := 1

const LINE_COLORS := [
	Color("#D4513B"), Color("#2F6F9F"), Color("#2F8F6B"),
	Color("#E0A035"), Color("#7A5AA6"), Color("#3A8D8A")
]

func setup(level_data: Dictionary) -> void:
	level = level_data
	initial_budget = float(level["budget"])
	budget = initial_budget
	for sid in level["stations"]:
		var s := DB.get_station(sid)
		s["queue"] = []
		stations[sid] = s
	queue_redraw()
	_emit_state()

func _process(delta: float) -> void:
	if level.is_empty():
		return
	if not paused:
		var dt := delta * speed
		sim_time += dt
		_simulate(dt)
	hud_accum += delta
	if hud_accum >= 0.12:
		hud_accum = 0.0
		_emit_state()
	queue_redraw()

func _simulate(dt: float) -> void:
	if int(level.get("stations", []).size()) >= 3:
		spawn_accum += dt
		var spawn_interval := 0.55 if level.get("title","") != "İlk Aktarma" else 0.42
		while spawn_accum >= spawn_interval:
			spawn_accum -= spawn_interval
			_spawn_passenger()

	var waits: Array[float] = []
	for sid in stations:
		var q: Array = stations[sid]["queue"]
		for p in q:
			p["wait"] = float(p.get("wait", 0.0)) + dt
			waits.append(float(p["wait"]))
		stations[sid]["queue"] = q

	for li in range(lines.size()):
		_update_line_trains(li, dt)

	if waits.size() > 0:
		var sum := 0.0
		for w in waits:
			sum += w
		avg_wait = sum / waits.size()
	else:
		avg_wait = max(0.0, avg_wait - dt * 0.5)

	var total_queue := 0
	for sid in stations:
		total_queue += stations[sid]["queue"].size()
	var target_sat := 100.0 - max(0, total_queue - 8) * 1.7 - max(0.0, avg_wait - 22.0) * 0.38
	target_sat = clamp(target_sat, 25.0, 100.0)
	satisfaction = lerp(satisfaction, target_sat, min(1.0, dt * 0.5))
	projected_net = delivered * 0.055 - _maintenance_cost()

func _maintenance_cost() -> float:
	var c := 0.0
	for line in lines:
		c += max(0, line["stations"].size() - 1) * 0.7
		c += line["trains"].size() * 1.1
	c += transfer_upgrades.size() * 0.8
	return c

func _spawn_passenger() -> void:
	var ids := stations.keys()
	if ids.size() < 2:
		return
	var origin := ids[randi() % ids.size()]
	var target := ids[randi() % ids.size()]
	if origin == target:
		target = ids[(ids.find(origin) + 1) % ids.size()]
	var q: Array = stations[origin]["queue"]
	if q.size() < 18:
		q.append({"target":target, "wait":0.0})
		stations[origin]["queue"] = q

func _update_line_trains(line_index: int, dt: float) -> void:
	if line_index < 0 or line_index >= lines.size():
		return
	var line: Dictionary = lines[line_index]
	var route: Array = line["stations"]
	if route.size() < 2:
		return
	var trains: Array = line["trains"]
	for ti in range(trains.size()):
		var tr: Dictionary = trains[ti]
		var idx := int(tr["index"])
		var dir := int(tr["dir"])
		var next_idx := idx + dir
		if next_idx < 0 or next_idx >= route.size():
			dir *= -1
			tr["dir"] = dir
			next_idx = idx + dir
		var a := _station_pos(route[idx])
		var b := _station_pos(route[next_idx])
		var dist := max(1.0, a.distance_to(b))
		tr["t"] = float(tr["t"]) + (150.0 * dt / dist)
		if float(tr["t"]) >= 1.0:
			tr["t"] = 0.0
			tr["index"] = next_idx
			_train_arrive(tr, route[next_idx], route)
		trains[ti] = tr
	line["trains"] = trains
	lines[line_index] = line

func _train_arrive(tr: Dictionary, station_id: String, route: Array) -> void:
	var onboard: Array = tr["onboard"]
	for i in range(onboard.size() - 1, -1, -1):
		if onboard[i] == station_id:
			onboard.remove_at(i)
			delivered += 1
	var q: Array = stations[station_id]["queue"]
	for i in range(q.size() - 1, -1, -1):
		if onboard.size() >= int(tr["capacity"]):
			break
		if route.has(q[i]["target"]):
			onboard.append(q[i]["target"])
			q.remove_at(i)
	tr["onboard"] = onboard
	stations[station_id]["queue"] = q

func _unhandled_input(event: InputEvent) -> void:
	if level.is_empty():
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_pointer_down(event.position)
			else:
				_pointer_up(event.position)
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			pass
	elif event is InputEventMouseMotion and drag_active:
		_pointer_move(event.position)
	elif event is InputEventScreenTouch:
		if event.pressed:
			_pointer_down(event.position)
		else:
			_pointer_up(event.position)
	elif event is InputEventScreenDrag and drag_active:
		_pointer_move(event.position)

func _pointer_down(pos: Vector2) -> void:
	var sid := _hit_station(pos)
	if sid != "":
		drag_station = sid
		drag_pos = pos
		drag_active = true
		drag_moved = false
		return
	var li := _hit_line(pos)
	if li >= 0:
		selected_line = li
		selected_station = ""
		selection_changed.emit("line", li, "")
		queue_redraw()
	else:
		selected_line = -1
		selected_station = ""
		selection_changed.emit("none", -1, "")

func _pointer_move(pos: Vector2) -> void:
	drag_pos = pos
	if drag_station != "" and pos.distance_to(_station_pos(drag_station)) > 18.0:
		drag_moved = true
	queue_redraw()

func _pointer_up(pos: Vector2) -> void:
	if not drag_active:
		return
	var source := drag_station
	var target := _hit_station(pos)
	drag_active = false
	drag_station = ""
	if drag_moved and source != "" and target != "" and source != target:
		_connect_stations(source, target)
	elif source != "":
		selected_station = source
		selected_line = -1
		selection_changed.emit("station", -1, source)
	queue_redraw()

func _connect_stations(a: String, b: String) -> void:
	var cost := _segment_cost(a, b)
	if budget < cost:
		action_message.emit("Bütçe yetersiz: %.1f M gerekli." % cost)
		return
	_store_undo_snapshot()
	var extend_index := _find_extendable_line(a)
	if extend_index >= 0:
		var line: Dictionary = lines[extend_index]
		var route: Array = line["stations"]
		if route[0] == a:
			route.push_front(b)
		else:
			route.append(b)
		line["stations"] = route
		lines[extend_index] = line
		selected_line = extend_index
		extension_commits += 1
	else:
		var new_line := {
			"id":next_line_id,
			"stations":[a,b],
			"color":LINE_COLORS[(next_line_id - 1) % LINE_COLORS.size()],
			"trains":[]
		}
		next_line_id += 1
		lines.append(new_line)
		selected_line = lines.size() - 1
	budget -= cost
	if _is_tunnel(a,b):
		tunnel_count += 1
	selected_station = ""
	selection_changed.emit("line", selected_line, "")
	action_message.emit("Hat inşa edildi  −%.1f M" % cost)
	_emit_state()

func _find_extendable_line(station_id: String) -> int:
	var matches: Array[int] = []
	for i in range(lines.size()):
		var route: Array = lines[i]["stations"]
		if route.size() > 0 and (route[0] == station_id or route[route.size()-1] == station_id):
			matches.append(i)
	if matches.size() == 1:
		return matches[0]
	if selected_line >= 0 and matches.has(selected_line):
		return selected_line
	return -1

func add_train_to_selected_line() -> bool:
	if selected_line < 0 or selected_line >= lines.size():
		return false
	var cost := 4.0
	if budget < cost:
		action_message.emit("Tren için %.1f M gerekiyor." % cost)
		return false
	_store_undo_snapshot()
	var line: Dictionary = lines[selected_line]
	var trains: Array = line["trains"]
	trains.append({"index":0,"dir":1,"t":0.0,"capacity":18,"onboard":[]})
	line["trains"] = trains
	lines[selected_line] = line
	budget -= cost
	action_message.emit("Tren hatta eklendi  −4.0 M")
	_emit_state()
	return true

func upgrade_selected_station() -> bool:
	if selected_station == "":
		return false
	if transfer_upgrades.has(selected_station):
		action_message.emit("Bu istasyon zaten Aktarma Merkezi.")
		return false
	var cost := 6.0
	if budget < cost:
		action_message.emit("Aktarma yükseltmesi için 6.0 M gerekiyor.")
		return false
	_store_undo_snapshot()
	transfer_upgrades[selected_station] = true
	budget -= cost
	action_message.emit("%s Aktarma Merkezi oldu." % stations[selected_station]["name"])
	_emit_state()
	return true

func undo_last_build() -> void:
	if undo_snapshot.is_empty() or Time.get_ticks_msec() / 1000.0 > undo_deadline:
		action_message.emit("GERİ AL süresi doldu.")
		return
	lines = undo_snapshot["lines"].duplicate(true)
	budget = float(undo_snapshot["budget"])
	tunnel_count = int(undo_snapshot["tunnel_count"])
	transfer_upgrades = undo_snapshot["transfer_upgrades"].duplicate(true)
	undo_snapshot = {}
	undo_used = true
	selected_line = -1
	selected_station = ""
	selection_changed.emit("none", -1, "")
	action_message.emit("Son inşa işlemi geri alındı.")
	_emit_state()

func _store_undo_snapshot() -> void:
	undo_snapshot = {
		"lines":lines.duplicate(true),
		"budget":budget,
		"tunnel_count":tunnel_count,
		"transfer_upgrades":transfer_upgrades.duplicate(true)
	}
	undo_deadline = Time.get_ticks_msec() / 1000.0 + 6.0

func toggle_pause() -> void:
	paused = not paused
	_emit_state()

func cycle_speed() -> void:
	if paused:
		paused = false
		speed = 1.0
	elif is_equal_approx(speed, 1.0):
		speed = 2.0
	elif is_equal_approx(speed, 2.0):
		speed = 3.0
	else:
		speed = 1.0
	_emit_state()

func get_state() -> Dictionary:
	var active_trains := 0
	for line in lines:
		active_trains += line["trains"].size()
	return {
		"budget":budget,
		"initial_budget":initial_budget,
		"delivered":delivered,
		"satisfaction":satisfaction,
		"avg_wait":avg_wait,
		"projected_net":projected_net,
		"tunnel_count":tunnel_count,
		"undo_used":undo_used,
		"emergency_used":emergency_used,
		"extension_commits":extension_commits,
		"transfer_count":transfer_upgrades.size(),
		"active_trains":active_trains,
		"line_count":lines.size(),
		"max_line_stations":_max_line_stations(),
		"continents_connected":_continents_connected(),
		"paused":paused,
		"speed":speed,
		"undo_available":not undo_snapshot.is_empty() and Time.get_ticks_msec()/1000.0 <= undo_deadline
	}

func _emit_state() -> void:
	state_changed.emit(get_state())

func _max_line_stations() -> int:
	var m := 0
	for line in lines:
		m = max(m, line["stations"].size())
	return m

func _continents_connected() -> bool:
	for line in lines:
		var has_eu := false
		var has_asia := false
		for sid in line["stations"]:
			has_eu = has_eu or stations[sid]["side"] == "eu"
			has_asia = has_asia or stations[sid]["side"] == "asia"
		if has_eu and has_asia:
			return true
	return false

func _segment_cost(a: String, b: String) -> float:
	var d := _station_pos(a).distance_to(_station_pos(b))
	var base := max(2.0, d / 38.0)
	if _is_tunnel(a,b):
		base *= 1.65
	return snapped(base, 0.1)

func _is_tunnel(a: String, b: String) -> bool:
	return stations[a]["side"] != stations[b]["side"]

func _station_pos(sid: String) -> Vector2:
	var p: Vector2 = stations[sid]["pos"]
	return Vector2(p.x * get_viewport_rect().size.x, p.y * get_viewport_rect().size.y)

func _hit_station(pos: Vector2) -> String:
	for sid in stations:
		if pos.distance_to(_station_pos(sid)) <= 34.0:
			return sid
	return ""

func _hit_line(pos: Vector2) -> int:
	for li in range(lines.size()):
		var route: Array = lines[li]["stations"]
		for i in range(route.size()-1):
			if _distance_to_segment(pos, _station_pos(route[i]), _station_pos(route[i+1])) < 18.0:
				return li
	return -1

func _distance_to_segment(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var denom := ab.length_squared()
	if denom <= 0.001:
		return p.distance_to(a)
	var t := clamp((p-a).dot(ab) / denom, 0.0, 1.0)
	return p.distance_to(a + ab*t)

func _draw() -> void:
	var vr := get_viewport_rect()
	draw_rect(Rect2(Vector2.ZERO, vr.size), UI.BG)
	_draw_istanbul_water(vr.size)
	_draw_lines()
	if drag_active and drag_station != "":
		var a := _station_pos(drag_station)
		var preview_color := LINE_COLORS[next_line_id % LINE_COLORS.size()]
		draw_dashed_line(a, drag_pos, preview_color, 5.0, 10.0, true)
	_draw_trains()
	_draw_stations()

func _draw_istanbul_water(sz: Vector2) -> void:
	var coast := PackedVector2Array([
		Vector2(sz.x*.585, -20),
		Vector2(sz.x*.615, sz.y*.11),
		Vector2(sz.x*.595, sz.y*.22),
		Vector2(sz.x*.625, sz.y*.33),
		Vector2(sz.x*.605, sz.y*.45),
		Vector2(sz.x*.638, sz.y*.58),
		Vector2(sz.x*.618, sz.y*.72),
		Vector2(sz.x*.65, sz.y+20),
		Vector2(sz.x*.76, sz.y+20),
		Vector2(sz.x*.71, sz.y*.72),
		Vector2(sz.x*.73, sz.y*.57),
		Vector2(sz.x*.70, sz.y*.43),
		Vector2(sz.x*.72, sz.y*.30),
		Vector2(sz.x*.69, sz.y*.16),
		Vector2(sz.x*.71, -20)
	])
	draw_colored_polygon(coast, UI.WATER)
	draw_polyline(PackedVector2Array([
		Vector2(0, sz.y*.79), Vector2(sz.x*.23,sz.y*.76),
		Vector2(sz.x*.40,sz.y*.80), Vector2(sz.x*.57,sz.y*.76)
	]), Color("#B8D7DB"), 2.0, true)

func _draw_lines() -> void:
	for li in range(lines.size()):
		var line: Dictionary = lines[li]
		var route: Array = line["stations"]
		var col: Color = line["color"]
		var width := 12.0 if li == selected_line else 9.0
		for i in range(route.size()-1):
			var a := _station_pos(route[i])
			var b := _station_pos(route[i+1])
			if _is_tunnel(route[i], route[i+1]):
				draw_dashed_line(a,b,col,width,14.0,true)
			else:
				draw_line(a,b,col,width,true)

func _draw_trains() -> void:
	for line in lines:
		var route: Array = line["stations"]
		for tr in line["trains"]:
			var idx := int(tr["index"])
			var dir := int(tr["dir"])
			var next_idx := idx + dir
			if next_idx < 0 or next_idx >= route.size():
				next_idx = idx - dir
			if next_idx < 0 or next_idx >= route.size():
				continue
			var a := _station_pos(route[idx])
			var b := _station_pos(route[next_idx])
			var p := a.lerp(b, float(tr["t"]))
			var tangent := (b-a).normalized()
			var normal := Vector2(-tangent.y, tangent.x)
			var body := PackedVector2Array([
				p - tangent*13 - normal*7,
				p + tangent*13 - normal*7,
				p + tangent*13 + normal*7,
				p - tangent*13 + normal*7
			])
			draw_colored_polygon(body, Color.WHITE)
			draw_polyline(PackedVector2Array([body[0],body[1],body[2],body[3],body[0]]), UI.INK, 2.0, true)

func _draw_stations() -> void:
	var font := ThemeDB.fallback_font
	for sid in stations:
		var p := _station_pos(sid)
		var upgraded := transfer_upgrades.has(sid)
		if upgraded:
			draw_circle(p, 24.0, Color(1,1,1,0.8))
			draw_arc(p, 24.0, 0, TAU, 32, UI.INK, 3.0, true)
		draw_circle(p, 14.0, UI.BG)
		draw_arc(p, 14.0, 0, TAU, 32, UI.INK, 3.0, true)
		if sid == selected_station:
			draw_arc(p, 20.0, 0, TAU, 32, UI.ACCENT, 3.0, true)
		var name: String = stations[sid]["name"]
		draw_string(font, p + Vector2(20,-18), name, HORIZONTAL_ALIGNMENT_LEFT, -1, 17, UI.INK)
		var qsize: int = stations[sid]["queue"].size()
		if qsize > 0:
			var badge := p + Vector2(20,9)
			draw_circle(badge, 12.0, UI.INK)
			draw_string(font, badge + Vector2(-7,6), str(qsize), HORIZONTAL_ALIGNMENT_CENTER, 14, 12, Color.WHITE)
