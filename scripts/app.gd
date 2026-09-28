extends Node

const MainMenuScreen = preload("res://scripts/main_menu.gd")
const CampaignScreen = preload("res://scripts/campaign_screen.gd")
const GameScreen = preload("res://scripts/game_screen.gd")
const SaveManager = preload("res://scripts/save_manager.gd")

var current_screen: Node

func _ready() -> void:
	SaveManager.load_save()
	show_main_menu()

func _replace_screen(next_screen: Node) -> void:
	if is_instance_valid(current_screen):
		current_screen.queue_free()
	current_screen = next_screen
	add_child(current_screen)

func show_main_menu() -> void:
	var screen = MainMenuScreen.new()
	screen.play_requested.connect(_on_quick_play)
	screen.campaign_requested.connect(show_campaign)
	_replace_screen(screen)

func show_campaign() -> void:
	var screen = CampaignScreen.new()
	screen.back_requested.connect(show_main_menu)
	screen.level_selected.connect(_on_level_selected)
	_replace_screen(screen)

func _on_quick_play() -> void:
	_on_level_selected(SaveManager.get_next_playable_level())

func _on_level_selected(level_id: String) -> void:
	var screen = GameScreen.new()
	screen.level_id = level_id
	screen.exit_requested.connect(show_campaign)
	screen.level_finished.connect(_on_level_finished)
	_replace_screen(screen)

func _on_level_finished(level_id: String, stars: int, reward_coin: int) -> void:
	SaveManager.complete_level(level_id, stars, reward_coin)
