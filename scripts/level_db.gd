extends RefCounted
class_name MetrovaLevelDB

const LEVELS := {
	"IST-01": {
		"title":"İlk Hat",
		"act":"ACT I",
		"budget":32.0,
		"reward_coin":50,
		"stations":["fatih","taksim"],
		"primary":{"type":"line_built","label":"Fatih ile Taksim arasında ilk hattını kur."},
		"bonus_a":{"type":"budget_pct","value":0.70,"label":"Bütçenin en az %70'i kalsın."},
		"bonus_b":{"type":"undo_unused","label":"GERİ AL kullanmadan tamamla."},
		"tutorial":"Bir istasyona dokunup diğerine sürükle. Çizgiyi bıraktığında hat inşa edilir."
	},
	"IST-02": {
		"title":"Hattı Uzat",
		"act":"ACT I",
		"budget":34.0,
		"reward_coin":65,
		"stations":["fatih","taksim","besiktas"],
		"primary":{"type":"line_station_count","value":3,"label":"Aynı hattı 3 durağa uzat."},
		"bonus_a":{"type":"budget_pct","value":0.75,"label":"Bütçenin en az %75'i kalsın."},
		"bonus_b":{"type":"single_extension","label":"Tek uzatma commit'i ile tamamla."},
		"tutorial":"Mevcut hattın uç durağından Beşiktaş'a sürükleyerek hattı uzat."
	},
	"IST-03": {
		"title":"İlk Sefer",
		"act":"ACT I",
		"budget":42.0,
		"reward_coin":80,
		"stations":["fatih","taksim","besiktas"],
		"primary":{"type":"delivered_and_train","value":80,"label":"80 yolcu taşı ve en az 1 tren işlet."},
		"bonus_a":{"type":"avg_wait","value":35.0,"label":"Ortalama bekleme 35 sn altında olsun."},
		"bonus_b":{"type":"budget_pct","value":0.70,"label":"Bütçenin en az %70'i kalsın."},
		"tutorial":"Hattı seç. Alttaki bağlamsal bardan TRENI EKLE. Yolcular hedef duraklarına taşındıkça sayaç artar."
	},
	"IST-04": {
		"title":"Boğazı Geç",
		"act":"ACT I",
		"budget":64.0,
		"reward_coin":95,
		"stations":["fatih","taksim","besiktas","uskudar"],
		"primary":{"type":"continents_connected","label":"Avrupa ile Anadolu yakasını bağla."},
		"bonus_a":{"type":"tunnel_max","value":1,"label":"Tek tünelle tamamla."},
		"bonus_b":{"type":"emergency_unused","label":"Acil Ulaşım Fonu kullanma."},
		"tutorial":"Üsküdar'a geçen segment tünel sayılır. Maliyet, normal raya göre daha yüksektir."
	},
	"IST-05": {
		"title":"İlk Aktarma",
		"act":"ACT I",
		"budget":54.0,
		"reward_coin":130,
		"reward_sp":1,
		"stations":["fatih","taksim","besiktas","uskudar","sisli"],
		"primary":{"type":"transfer_and_delivered","value":120,"label":"Bir Aktarma Merkezi kur ve 120 yolcu taşı."},
		"bonus_a":{"type":"satisfaction","value":75.0,"label":"Memnuniyet %75 veya üzeri olsun."},
		"bonus_b":{"type":"emergency_unused","label":"Borç/recovery kullanmadan tamamla."},
		"tutorial":"Bir istasyona dokun. Alt bardan AKTARMA YÜKSELT seç; ardından iki hattı o istasyonda buluştur."
	}
}

const STATIONS := {
	"fatih":{"name":"Fatih","pos":Vector2(0.39,0.57),"side":"eu","shape":"circle"},
	"taksim":{"name":"Taksim","pos":Vector2(0.44,0.37),"side":"eu","shape":"square"},
	"besiktas":{"name":"Beşiktaş","pos":Vector2(0.54,0.34),"side":"eu","shape":"triangle"},
	"uskudar":{"name":"Üsküdar","pos":Vector2(0.67,0.45),"side":"asia","shape":"diamond"},
	"sisli":{"name":"Şişli","pos":Vector2(0.48,0.22),"side":"eu","shape":"hex"}
}

static func get_level(level_id: String) -> Dictionary:
	return LEVELS.get(level_id, LEVELS["IST-01"]).duplicate(true)

static func get_station(station_id: String) -> Dictionary:
	return STATIONS[station_id].duplicate(true)
