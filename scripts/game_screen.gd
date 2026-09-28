extends Node

signal exit_requested
signal level_finished(level_id: String, stars: int, reward_coin: int)

const UI = preload("res://scripts/ui_style.gd")
const DB = preload("res://scripts/level_db.gd")
const GameWorld = preload("res://scripts/game_world.gd")

var level_id := "IST-01"
var level: Dictionary
var world: Node2D
var canvas: CanvasLayer

var level_label: Label
var phase_label: Label
var budget_label: Label
var net_label: Label
var sat_label: Label
var passenger_label: Label
var pause_btn: Button
var speed_btn: Button
var context_panel: PanelContainer
var context_title: Label
var context_actions: HBoxContainer
var objective_label: Label
var bonus_label: Label
var toast_panel: PanelContainer
var toast_label: Label
var tutorial_panel: PanelContainer
var tutorial_label: Label

var latest_state: Dictionary = {}
var objective_done := false
var completion_delay := 0.0
var result_open := false
var selected_kind := "none"
var selected_index := -1
var selected_station := ""

func _ready() -> void:
	level = DB.get_level(level_id)
	world = GameWorld.new()
	add_child(world)
	world.state_changed.connect(_on_state_changed)
	world.selection_changed.connect(_on_selection_changed)
	world.action_message.connect(_show_toast)
	world.setup(level)
	_build_hud()

func _process(delta: float) -> void:
	if result_open or latest_state.is_empty():
		return
	if _primary_complete(latest_state):
		if not objective_done:
			objective_done = true
			completion_delay = 0.85
		else:
			completion_delay -= delta
			if completion_delay <= 0.0:
				_open_result()
	else:
		objective_done = false

func _build_hud() -> void:
	canvas = CanvasLayer.new()
	canvas.layer = 20
	add_child(canvas)

	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(root)

	var left := PanelContainer.new()
	left.position = Vector2(26, 24)
	left.custom_minimum_size = Vector2(220, 82)
	left.add_theme_stylebox_override("panel", UI.panel(18, 0.88))
	root.add_child(left)
	var lv := VBoxContainer.new()
	lv.add_theme_constant_override("separation", 2)
	left.add_child(lv)
	level_label = UI.make_label("İSTANBUL  ·  %s" % level_id, 17, UI.INK)
	phase_label = UI.make_label("%s  /  %s" % [level["act"], level["title"]], 14, UI.MUTED)
	lv.add_child(level_label)
	lv.add_child(phase_label)

	var metrics := PanelContainer.new()
	metrics.anchor_left = 0.5
	metrics.anchor_right = 0.5
	metrics.offset_left = -345
	metrics.offset_right = 345
	metrics.offset_top = 24
	metrics.offset_bottom = 91
	metrics.add_theme_stylebox_override("panel", UI.panel(18, 0.88))
	root.add_child(metrics)
	var metric_row := HBoxContainer.new()
	metric_row.alignment = BoxContainer.ALIGNMENT_CENTER
	metric_row.add_theme_constant_override("separation", 30)
	metrics.add_child(metric_row)
	budget_label = _metric(metric_row, "BÜTÇE", "0 M")
	net_label = _metric(metric_row, "YILLIK NET", "0 M")
	sat_label = _metric(metric_row, "MEMNUNİYET", "%100")
	passenger_label = _metric(metric_row, "HEDEF", "0")

	var right := PanelContainer.new()
	right.anchor_left = 1.0
	right.anchor_right = 1.0
	right.offset_left = -290
	right.offset_right = -26
	right.offset_top = 24
	right.offset_bottom = 91
	right.add_theme_stylebox_override("panel", UI.panel(18, 0.88))
	root.add_child(right)
	var controls := HBoxContainer.new()
	controls.alignment = BoxContainer.ALIGNMENT_CENTER
	controls.add_theme_constant_override("separation", 8)
	right.add_child(controls)
	pause_btn = _compact_button("Ⅱ")
	pause_btn.tooltip_text = "Planlama modu / Pause"
	pause_btn.pressed.connect(func(): world.toggle_pause())
	controls.add_child(pause_btn)
	speed_btn = _compact_button("1×")
	speed_btn.pressed.connect(func(): world.cycle_speed())
	controls.add_child(speed_btn)
	var undo_btn := _compact_button("↶")
	undo_btn.tooltip_text = "Son inşa işlemini 6 saniye içinde geri al"
	undo_btn.pressed.connect(func(): world.undo_last_build())
	controls.add_child(undo_btn)
	var exit_btn := _compact_button("⌂")
	exit_btn.tooltip_text = "Kariyere dön"
	exit_btn.pressed.connect(func(): exit_requested.emit())
	controls.add_child(exit_btn)

	var objective := PanelContainer.new()
	objective.position = Vector2(26, 122)
	objective.custom_minimum_size = Vector2(320, 0)
	objective.add_theme_stylebox_override("panel", UI.panel(18, 0.84))
	root.add_child(objective)
	var ob := VBoxContainer.new()
	ob.add_theme_constant_override("separation", 6)
	objective.add_child(ob)
	ob.add_child(UI.make_label("GÖREV", 13, UI.MUTED))
	objective_label = UI.make_label(level["primary"]["label"], 17, UI.INK)
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	ob.add_child(objective_label)
	bonus_label = UI.make_label("☆  %s\n☆  %s" % [level["bonus_a"]["label"], level["bonus_b"]["label"]], 14, UI.MUTED)
	bonus_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	ob.add_child(bonus_label)

	tutorial_panel = PanelContainer.new()
	tutorial_panel.anchor_left = 0.5
	tutorial_panel.anchor_right = 0.5
	tutorial_panel.anchor_top = 1.0
	tutorial_panel.anchor_bottom = 1.0
	tutorial_panel.offset_left = -360
	tutorial_panel.offset_right = 360
	tutorial_panel.offset_top = -148
	tutorial_panel.offset_bottom = -88
	tutorial_panel.add_theme_stylebox_override("panel", UI.panel(18, 0.92))
	root.add_child(tutorial_panel)
	tutorial_label = UI.make_label(level["tutorial"], 15, UI.INK)
	tutorial_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tutorial_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	tutorial_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	tutorial_panel.add_child(tutorial_label)

	context_panel = PanelContainer.new()
	context_panel.anchor_left = 0.5
	context_panel.anchor_right = 0.5
	context_panel.anchor_top = 1.0
	context_panel.anchor_bottom = 1.0
	context_panel.offset_left = -360
	context_panel.offset_right = 360
	context_panel.offset_top = -82
	context_panel.offset_bottom = -20
	context_panel.add_theme_stylebox_override("panel", UI.panel(20, 0.96))
	context_panel.visible = false
	root.add_child(context_panel)
	var ctx := HBoxContainer.new()
	ctx.add_theme_constant_override("separation", 10)
	context_panel.add_child(ctx)
	context_title = UI.make_label("", 16, UI.INK)
	context_title.custom_minimum_size = Vector2(170, 0)
	context_title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	ctx.add_child(context_title)
	context_actions = HBoxContainer.new()
	context_actions.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	context_actions.alignment = BoxContainer.ALIGNMENT_END
	context_actions.add_theme_constant_override("separation", 8)
	ctx.add_child(context_actions)

	toast_panel = PanelContainer.new()
	toast_panel.anchor_left = 0.5
	toast_panel.anchor_right = 0.5
	toast_panel.offset_left = -210
	toast_panel.offset_right = 210
	toast_panel.offset_top = 104
	toast_panel.offset_bottom = 154
	toast_panel.add_theme_stylebox_override("panel", UI.dark_button())
	toast_panel.visible = false
	root.add_child(toast_panel)
	toast_label = UI.make_label("", 15, Color.WHITE)
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_panel.add_child(toast_label)

func _metric(row: HBoxContainer, title: String, value: String) -> Label:
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(120, 0)
	box.add_theme_constant_override("separation", 1)
	var t := UI.make_label(title, 11, UI.MUTED)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(t)
	var v := UI.make_label(value, 17, UI.INK)
	v.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(v)
	row.add_child(box)
	return v

func _compact_button(text: String) -> Button:
	var b := UI.make_button(text)
	b.custom_minimum_size = Vector2(58, 54)
	b.add_theme_font_size_override("font_size", 20)
	return b

func _on_state_changed(state: Dictionary) -> void:
	latest_state = state
	if budget_label == null:
		return
	budget_label.text = "%.1f M" % float(state["budget"])
	net_label.text = "%+.1f M" % float(state["projected_net"])
	sat_label.text = "%%%d" % int(round(float(state["satisfaction"])))
	var target := _target_value()
	passenger_label.text = "%d / %d" % [int(state["delivered"]), target] if target > 0 else _primary_progress_text(state)
	pause_btn.text = "▶" if bool(state["paused"]) else "Ⅱ"
	speed_btn.text = "%d×" % int(state["speed"])

func _target_value() -> int:
	var t: Dictionary = level["primary"]
	if t["type"] in ["delivered_and_train","transfer_and_delivered"]:
		return int(t["value"])
	return 0

func _primary_progress_text(state: Dictionary) -> String:
	match level["primary"]["type"]:
		"line_built":
			return "HAT %d" % int(state["line_count"])
		"line_station_count":
			return "%d / %d DURAK" % [int(state["max_line_stations"]), int(level["primary"]["value"])]
		"continents_connected":
			return "BAĞLI" if bool(state["continents_connected"]) else "2 YAKA"
	return str(int(state["delivered"]))

func _on_selection_changed(kind: String, index: int, station_id: String) -> void:
	selected_kind = kind
	selected_index = index
	selected_station = station_id
	for c in context_actions.get_children():
		c.queue_free()
	if kind == "line":
		context_title.text = "HAT %02d" % (index + 1)
		var train := UI.make_button("TREN EKLE")
		train.custom_minimum_size = Vector2(170, 48)
		train.pressed.connect(func(): world.add_train_to_selected_line())
		context_actions.add_child(train)
		var tip := UI.make_label("Uç duraktan sürükle → uzat", 14, UI.MUTED)
		tip.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		context_actions.add_child(tip)
		context_panel.visible = true
	elif kind == "station":
		context_title.text = DB.get_station(station_id)["name"]
		var upgrade := UI.make_button("AKTARMA YÜKSELT")
		upgrade.custom_minimum_size = Vector2(210, 48)
		upgrade.pressed.connect(func(): world.upgrade_selected_station())
		context_actions.add_child(upgrade)
		context_panel.visible = true
	else:
		context_panel.visible = false

func _show_toast(text: String) -> void:
	toast_label.text = text
	toast_panel.visible = true
	var timer := get_tree().create_timer(2.0)
	timer.timeout.connect(func():
		if is_instance_valid(toast_panel):
			toast_panel.visible = false
	)

func _primary_complete(state: Dictionary) -> bool:
	var t: Dictionary = level["primary"]
	match t["type"]:
		"line_built":
			return int(state["line_count"]) >= 1
		"line_station_count":
			return int(state["max_line_stations"]) >= int(t["value"])
		"delivered_and_train":
			return int(state["delivered"]) >= int(t["value"]) and int(state["active_trains"]) >= 1
		"continents_connected":
			return bool(state["continents_connected"])
		"transfer_and_delivered":
			return int(state["transfer_count"]) >= 1 and int(state["delivered"]) >= int(t["value"])
	return false

func _bonus_complete(rule: Dictionary, state: Dictionary) -> bool:
	match rule["type"]:
		"budget_pct":
			return float(state["budget"]) / max(0.01, float(state["initial_budget"])) >= float(rule["value"])
		"undo_unused":
			return not bool(state["undo_used"])
		"single_extension":
			return int(state["extension_commits"]) <= 1
		"avg_wait":
			return float(state["avg_wait"]) < float(rule["value"])
		"tunnel_max":
			return int(state["tunnel_count"]) <= int(rule["value"])
		"emergency_unused":
			return not bool(state["emergency_used"])
		"satisfaction":
			return float(state["satisfaction"]) >= float(rule["value"])
	return false

func _open_result() -> void:
	if result_open:
		return
	result_open = true
	world.paused = true
	var stars := 1
	if _bonus_complete(level["bonus_a"], latest_state):
		stars += 1
	if _bonus_complete(level["bonus_b"], latest_state):
		stars += 1
	var reward := int(level["reward_coin"])
	level_finished.emit(level_id, stars, reward)

	var dim := ColorRect.new()
	dim.color = Color(0.08,0.10,0.11,0.42)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(dim)

	var card := PanelContainer.new()
	card.anchor_left = 0.5
	card.anchor_right = 0.5
	card.anchor_top = 0.5
	card.anchor_bottom = 0.5
	card.offset_left = -270
	card.offset_right = 270
	card.offset_top = -230
	card.offset_bottom = 230
	card.add_theme_stylebox_override("panel", UI.panel(28, 0.99))
	dim.add_child(card)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 13)
	card.add_child(box)
	var done := UI.make_label("HAT TAMAMLANDI", 14, UI.MUTED)
	done.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(done)
	var title := UI.make_label("%s  ·  %s" % [level_id, level["title"]], 30, UI.INK)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	var star_text := "★".repeat(stars) + "☆".repeat(3-stars)
	var st := UI.make_label(star_text, 52, UI.WARN)
	st.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(st)
	var info := UI.make_label(
		"%d yolcu   ·   %%%d memnuniyet   ·   %.1f M kalan\n+%d Metro Coin (ilk tamamlamada)" %
		[int(latest_state["delivered"]), int(round(float(latest_state["satisfaction"]))), float(latest_state["budget"]), reward],
		16, UI.MUTED
	)
	info.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(info)

	var primary_line := UI.make_label("✓  " + level["primary"]["label"], 15, UI.GOOD)
	box.add_child(primary_line)
	var a_ok := _bonus_complete(level["bonus_a"], latest_state)
	var b_ok := _bonus_complete(level["bonus_b"], latest_state)
	box.add_child(UI.make_label(("%s  " % ("✓" if a_ok else "○")) + level["bonus_a"]["label"], 14, UI.GOOD if a_ok else UI.MUTED))
	box.add_child(UI.make_label(("%s  " % ("✓" if b_ok else "○")) + level["bonus_b"]["label"], 14, UI.GOOD if b_ok else UI.MUTED))

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(spacer)

	var buttons := HBoxContainer.new()
	buttons.add_theme_constant_override("separation", 10)
	box.add_child(buttons)
	var retry := UI.make_button("TEKRAR")
	retry.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	retry.pressed.connect(_restart_level)
	buttons.add_child(retry)
	var next := UI.make_button("SONRAKİ", true)
	next.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	next.pressed.connect(_next_level)
	buttons.add_child(next)

func _restart_level() -> void:
	get_parent()._on_level_selected(level_id)

func _next_level() -> void:
	var n := int(level_id.get_slice("-",1))
	if n < 5:
		get_parent()._on_level_selected("IST-%02d" % (n+1))
	else:
		exit_requested.emit()
