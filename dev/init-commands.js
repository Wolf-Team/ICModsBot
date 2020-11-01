new Command("ID", "(?:(?:\\/)?id|мод|mod)\\s([0-9]+)", async function (args, msg) {
    let mod = await ICModsAPI.description(parseInt(args[1]));
    if(mod.error || mod.enabled == 0)
        return msg.reply("Мод с данным ID не найден.");

    mod.description = (await ICModsAPI.listForIDs([mod.id]))[0].description;
    msg.reply(`${mod.title} [${mod.version_name}]

${mod.description}

Автор: ${mod.author_name}
Скачиваний: ${mod.downloads}
Лайков: ${mod.likes}
Последнее обновление: ${mod.last_update}
Теги: ${mod.tags.join(", ")}

Страница мода: https://icmods.mineprogramming.org/mod?id=${mod.id}
Скачать мод: https://icmods.mineprogramming.org/api/download?id=${mod.id}`);
});