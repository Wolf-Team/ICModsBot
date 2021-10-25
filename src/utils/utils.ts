import ICModsAPI from "icmodsapi";
const HIDDEN_ICON = "[H]";

interface PrintModSettings {
	title?: string,
	downloads?: true,
	tags?: true,
	github?: true,
	multiplayer?: true,
	likes?: true,
	last_update?: true,
	changelog?: true
}
export function printMod(mod: ICModsAPI.ModInfo, settings: PrintModSettings) {
	let str = settings.title ? settings.title + "\n\n" : "";

	if (mod.hidden) str += HIDDEN_ICON + " ";
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
	if (settings.multiplayer && mod.multiplayer)
		str += "👥 Поддержка мультиплеера\n";

	if (settings.changelog && mod.version > 1)
		str += `\n📄 ChangeLog:\n${mod.changelog}\n`;

	str += `\n📋 Страница мода: https://icmods.mineprogramming.org/mod?id=${mod.id}\n📥 Скачать мод: https://icmods.mineprogramming.org/api/download?horizon&id=${mod.id}`
	return str;
}

interface PrintCommentSettings {
	mod_title: string,
	mod_id: number,
	author: string,
	comment: string
}
export function printComment(settings: PrintCommentSettings) {
	return `Новый комментарий под модом ${settings.mod_title}!

👤 Автор ${settings.author}
- ${settings.comment}

📋 Страница мода: https://icmods.mineprogramming.org/mod?id=${settings.mod_id}`
}

export function beautifyNumber(num: number, point: string = ","): string {
	let n: string = num.toString();
	let str: string = "";
	for (let i = n.length - 1; i >= 0; i--) {
		str = n[i] + str;
		if ((n.length - i) % 3 === 0)
			str = point + str;
	}
	return str;
}
