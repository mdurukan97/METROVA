extends RefCounted
class_name MetrovaSaveManager

const SAVE_PATH := "user://metrova_save.json"

static var data := {
	"coins": 0,
	"skill_points": 0,
	"completed": {},
	"schema_version": 1
}

static func load_save() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		save()
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) == TYPE_DICTIONARY:
		data.merge(parsed, true)

static func save() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(data))

static func complete_level(level_id: String, stars: int, reward_coin: int) -> void:
	var old_stars := int(data["completed"].get(level_id, 0))
	if stars > old_stars:
		data["completed"][level_id] = stars
		if old_stars == 0:
			data["coins"] = int(data.get("coins", 0)) + reward_coin
	save()

static func stars_for(level_id: String) -> int:
	return int(data["completed"].get(level_id, 0))

static func is_unlocked(level_id: String) -> bool:
	var n := int(level_id.get_slice("-", 1))
	if n <= 1:
		return true
	var prev := "IST-%02d" % (n - 1)
	return stars_for(prev) >= 1

static func get_next_playable_level() -> String:
	for i in range(1, 6):
		var id := "IST-%02d" % i
		if is_unlocked(id) and stars_for(id) == 0:
			return id
	for i in range(1, 6):
		var id := "IST-%02d" % i
		if is_unlocked(id):
			return id
	return "IST-01"
