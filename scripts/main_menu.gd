extends Control

signal play_requested
signal campaign_requested

const UI = preload("res://scripts/ui_style.gd")
const SaveManager = preload("res://scripts/save_manager.gd")

var phase := 0.0

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	queue_redraw()
	_build_ui()

func _process(delta: float) -> void:
	phase += delta * 0.08
	queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), UI.BG)
	var w := size.x
	var h := size.y
	var y1 := h * 0.32 + sin(phase * 2.0) * 8.0
	var y2 := h * 0.58 + cos(phase * 1.6) * 7.0
	var y3 := h * 0.76 + sin(phase * 1.2) * 5.0
	draw_polyline(PackedVector2Array([
		Vector2(-40, y1), Vector2(w*0.22,y1), Vector2(w*0.37,y1+80), Vector2(w*0.63,y1+80), Vector2(w+40,y1+20)
	]), Color("#D4513B"), 8.0, true)
	draw_polyline(PackedVector2Array([
		Vector2(-40, y2), Vector2(w*0.30,y2), Vector2(w*0.43,y2-90), Vector2(w*0.70,y2-90), Vector2(w+40,y2+20)
	]), Color("#2F6F9F"), 8.0, true)
	draw_polyline(PackedVector2Array([
		Vector2(-40, y3), Vector2(w*0.18,y3), Vector2(w*0.35,y3-55), Vector2(w*0.58,y3-55), Vector2(w+40,y3-120)
	]), Color("#2F8F6B"), 8.0, true)
	for p in [Vector2(w*.22,y1), Vector2(w*.37,y1+80), Vector2(w*.63,y1+80),
			  Vector2(w*.30,y2), Vector2(w*.43,y2-90), Vector2(w*.70,y2-90),
			  Vector2(w*.18,y3), Vector2(w*.35,y3-55), Vector2(w*.58,y3-55)]:
		draw_circle(p, 11.0, UI.BG)
		draw_arc(p, 11.0, 0, TAU, 36, UI.INK, 3.0, true)

func _build_ui() -> void:
	var safe := MarginContainer.new()
	safe.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	safe.add_theme_constant_override("margin_left", 56)
	safe.add_theme_constant_override("margin_right", 56)
	safe.add_theme_constant_override("margin_top", 44)
	safe.add_theme_constant_override("margin_bottom", 44)
	add_child(safe)

	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 18)
	safe.add_child(root)

	var top := HBoxContainer.new()
	root.add_child(top)

	var studio := UI.make_label("MHDRN STÜDYOSU", 16, UI.MUTED)
	top.add_child(studio)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)
	var coin := UI.make_label("●  %d Metro Coin" % int(SaveManager.data.get("coins",0)), 17)
	top.add_child(coin)

	var flexible := Control.new()
	flexible.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(flexible)

	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(510, 0)
	card.add_theme_stylebox_override("panel", UI.panel(28, 0.93))
	card.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	root.add_child(card)

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 14)
	card.add_child(content)

	var logo := UI.make_label("METROVA", 54, UI.INK)
	logo.add_theme_font_size_override("font_size", 54)
	content.add_child(logo)

	var tagline := UI.make_label("Şehrin akışını çiz.", 20, UI.MUTED)
	content.add_child(tagline)

	var gap := Control.new()
	gap.custom_minimum_size = Vector2(0, 12)
	content.add_child(gap)

	var continue_btn := UI.make_button("DEVAM ET", true)
	continue_btn.pressed.connect(func(): play_requested.emit())
	content.add_child(continue_btn)

	var campaign_btn := UI.make_button("KARİYER / İSTANBUL")
	campaign_btn.pressed.connect(func(): campaign_requested.emit())
	content.add_child(campaign_btn)

	var locked := UI.make_button("GARAJ  ·  YETENEKLER  ·  MARKET")
	locked.disabled = true
	locked.tooltip_text = "GDD Faz D–G ile açılacak."
	content.add_child(locked)

	var version := UI.make_label("Production slice 0.1  •  Godot 4.x  •  Android landscape", 14, UI.MUTED)
	root.add_child(version)
