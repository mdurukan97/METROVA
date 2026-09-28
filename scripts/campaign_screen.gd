extends Control

signal back_requested
signal level_selected(level_id: String)

const UI = preload("res://scripts/ui_style.gd")
const SaveManager = preload("res://scripts/save_manager.gd")

var level_names := {
	1:"İlk Hat", 2:"Hattı Uzat", 3:"İlk Sefer", 4:"Boğazı Geç", 5:"İlk Aktarma"
}

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build_ui()

func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.color = UI.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var safe := MarginContainer.new()
	safe.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	safe.add_theme_constant_override("margin_left", 48)
	safe.add_theme_constant_override("margin_right", 48)
	safe.add_theme_constant_override("margin_top", 36)
	safe.add_theme_constant_override("margin_bottom", 36)
	add_child(safe)

	var main := VBoxContainer.new()
	main.add_theme_constant_override("separation", 20)
	safe.add_child(main)

	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 18)
	main.add_child(top)

	var back := UI.make_button("←")
	back.custom_minimum_size = Vector2(64,58)
	back.pressed.connect(func(): back_requested.emit())
	top.add_child(back)

	var title_box := VBoxContainer.new()
	top.add_child(title_box)
	title_box.add_child(UI.make_label("İSTANBUL", 34, UI.INK))
	title_box.add_child(UI.make_label("ACT I · Eğitim Hattı", 15, UI.MUTED))
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)
	top.add_child(UI.make_label("★  İlk 5 seviye oynanabilir", 16, UI.MUTED))

	var track := PanelContainer.new()
	track.size_flags_vertical = Control.SIZE_EXPAND_FILL
	track.add_theme_stylebox_override("panel", UI.panel(26, 0.90))
	main.add_child(track)

	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 20)
	track.add_child(row)

	for i in range(1, 6):
		var id := "IST-%02d" % i
		var unlocked := SaveManager.is_unlocked(id)
		var stars := SaveManager.stars_for(id)
		var card := _level_card(id, i, level_names[i], stars, unlocked)
		row.add_child(card)

	var footer := HBoxContainer.new()
	main.add_child(footer)
	footer.add_child(UI.make_label("Harita: şematik İstanbul · GDD IST-01–05 tutorial slice", 14, UI.MUTED))
	var footer_spacer := Control.new()
	footer_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(footer_spacer)
	footer.add_child(UI.make_label("Coin: %d" % int(SaveManager.data.get("coins",0)), 16, UI.INK))

func _level_card(id: String, n: int, title: String, stars: int, unlocked: bool) -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(205, 300)
	panel.add_theme_stylebox_override("panel", UI.panel(22, 0.98 if unlocked else 0.62))

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	panel.add_child(box)

	var num := UI.make_label("%02d" % n, 42, UI.INK if unlocked else UI.MUTED)
	box.add_child(num)
	box.add_child(UI.make_label(id, 14, UI.MUTED))
	var name := UI.make_label(title, 20, UI.INK if unlocked else UI.MUTED)
	name.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(name)

	var grow := Control.new()
	grow.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(grow)

	var star_text := ""
	for j in range(3):
		star_text += "★" if j < stars else "☆"
	var stars_label := UI.make_label(star_text, 28, UI.WARN if stars > 0 else UI.MUTED)
	box.add_child(stars_label)

	var btn := UI.make_button("OYNA" if unlocked else "KİLİTLİ", unlocked)
	btn.disabled = not unlocked
	btn.pressed.connect(func(): level_selected.emit(id))
	box.add_child(btn)
	return panel
