extends RefCounted
class_name MetrovaUIStyle

const BG := Color("#F1EADB")
const INK := Color("#263238")
const MUTED := Color("#6E756F")
const PANEL := Color(1, 1, 1, 0.91)
const PANEL_DARK := Color("#263238")
const ACCENT := Color("#D4513B")
const GOOD := Color("#2F8F6B")
const WARN := Color("#D49A37")
const WATER := Color("#C6E4E8")

static func panel(radius: float = 18.0, alpha: float = 0.92) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(1, 1, 1, alpha)
	s.corner_radius_top_left = int(radius)
	s.corner_radius_top_right = int(radius)
	s.corner_radius_bottom_left = int(radius)
	s.corner_radius_bottom_right = int(radius)
	s.content_margin_left = 16
	s.content_margin_right = 16
	s.content_margin_top = 10
	s.content_margin_bottom = 10
	s.shadow_color = Color(0, 0, 0, 0.10)
	s.shadow_size = 8
	return s

static func dark_button() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = PANEL_DARK
	s.corner_radius_top_left = 16
	s.corner_radius_top_right = 16
	s.corner_radius_bottom_left = 16
	s.corner_radius_bottom_right = 16
	s.content_margin_left = 18
	s.content_margin_right = 18
	s.content_margin_top = 12
	s.content_margin_bottom = 12
	return s

static func light_button() -> StyleBoxFlat:
	var s := panel(16, 0.96)
	s.shadow_size = 4
	return s

static func make_label(text: String, size := 18, color := INK) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l

static func make_button(text: String, primary := false) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, 58)
	b.add_theme_font_size_override("font_size", 18)
	b.add_theme_color_override("font_color", Color.WHITE if primary else INK)
	b.add_theme_stylebox_override("normal", dark_button() if primary else light_button())
	b.add_theme_stylebox_override("hover", dark_button() if primary else light_button())
	b.add_theme_stylebox_override("pressed", dark_button() if primary else light_button())
	return b
