const request = require('request-promise-native'),
	fs = require("fs"),
	express = require('express');

const config = JSON.parse(fs.readFileSync("config.json")),
	HIDDEN_ICON = "🔒 ";
const ADMINS = [config.owner, 303851329, 2000000013];

let donuts_users = [];

function isInt(a) {
	return typeof a == "number" && a == parseInt(a)
}

function isDonut(user){
	return donuts_users.includes(user) || ADMINS.includes(user);
}

function beautifyNumber(n, point = ",") {
	n = n.toString();
	let str = "";
	for (let i = n.length - 1; i >= 0; i--) {
		str = n[i] + str;
		if ((n.length - i) % 3 === 0)
			str = point + str;
	}
	return str;
}

function readBD(file, def = {}) {
	return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def;
}

async function isAdmin(user_id, chat_id) {
	if (!VKAPI.isChat(chat_id))
		return true;

	let r = await VKAPI.invokeMethod("messages.getConversationsById", {
		peer_ids: VKAPI.getPeerIDfromChat(chat_id)
	});
	if (r.error) throw r.error;
	if (r.count == 0) throw "no_perms";
	let sett = r.items[0].chat_settings;
	if (sett.owner_id == user_id) return true;
	return sett.admin_ids.indexOf(user_id) != -1;
}

function printMod(mod, settings) {
	let str = settings.title ? settings.title + "\n\n" : "";
	
	if (mod.hidden) str += HIDDEN_ICON;
	str += `${mod.title} [${mod.version_name}]\n\n`
	if (mod.enabled) str += mod.description + "\n\n";
	str += `👤 Автор: ${mod.author_name}\n`;

	if (settings.downloads)
		str += `📥 Скачиваний: ${mod.downloads}\n`;
	if (settings.likes)
		str += `❤ Лайков: ${mod.likes}\n`;
	if (settings.last_update)
		str += `🕑 Последнее обновление: ${mod.last_update}\n`;
	if (settings.tags)
		str += `🔗 Теги: ${mod.tags.join(", ")}\n`;
	if (settings.github && mod.github)
		str += `📝 GitHub: ${mod.github}\n`;
	if (settings.multiplayer && mod.multiplayer == 1)
		str += "👥 Поддержка мультиплеера\n";

	if (settings.changelog && mod.version > 1)
		str += `\n📄 ChangeLog:\n${mod.changelog}\n`;

	str += `\n📋 Страница мода: https://icmods.mineprogramming.org/mod?id=${mod.id}\n📥 Скачать мод: https://icmods.mineprogramming.org/api/download?horizon&id=${mod.id}`
	return str;
}

function printComment(settings) {
	return `Новый комментарий под модом ${settings.mod_title}!

👤 Автор ${settings.author}
- ${settings.comment}

📋 Страница мода: https://icmods.mineprogramming.org/mod?id=${settings.mod_id}`
}