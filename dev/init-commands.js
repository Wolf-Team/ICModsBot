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

new Command("Statistic download", "Статистика\\sзагрузок\\s([0-9]+)", async function(args, msg){
    let mods = await ICModsAPI.searchModsFromAuthor(parseInt(args[1]));
    if(mods.length == 0)
        return msg.reply("Моды автора не найдены.");
    
    let str = "";
    let downloads = 0;
    for(let i in mods){
        let mod = await ICModsAPI.description(mods[i].id);
        str += `${mod.title}: ${beautifyNumber(mod.downloads, " ")}\n`;
        downloads += mod.downloads;
    }
    str += "\nОбщее количество загрузок: " + beautifyNumber(downloads, " ");
    msg.reply(str);
});

new Command("Подписаться на обновления", "подписаться\\sна\\sобновления\\s([0-9]+|модов)", async function(args, msg){
    let id = parseInt(args[1]);
    let following = Follow.getFor(msg.peer_id);
    let message = "";
    if(isNaN(id)){
        following.followAll(true);
        message = "Вы подписались на уведомления об обновлении всех модов."
    }else{
        let mod = await ICModsAPI.description(id);
        if(mod.error){
           message = `Мод с id ${id} не найден`; 
        }else{
            following.add(id);
            message = `Вы подписались на уведомления об обновлении ${mod.title}.`
        }
    }
    msg.reply(message);
});

new Command("Подписаться на новые моды", "подписаться\\sна\\sновые\\sмоды", function(args, msg){
    Follow.getFor(msg.peer_id).followNew(true);
    msg.reply("Вы подписались на уведомления о загрузке новых модов.");
});

new Command("Подписки", "подписки", async function(args, msg){
    let peer = Follow.getFor(msg.peer_id);
    if(peer.all)
        return msg.reply("Вы следите за всеми модами.");

    
    let mess = "";
    if(peer.new)
        mess = "Вы следите за загрузками новых модов\n";
    
    if(peer.ids.length > 0){
        mess += "Вы следите за следующими модами:";
        let mods = await ICModsAPI.listForIDs(peer.ids);
        for(let i in mods){
            let mod = mods[i];
            mess += `\n${mod.title} - https://icmods.mineprogramming.org/mod?id=${mod.id}`;
        }
    }

    msg.reply(mess);
});

new Command("Помощь", "помощь", (a, msg) => msg.reply(
`===== Помощь =====
Мод (ID мода) - Вывести информацию о моде
Подписки - Информация о подписках на уведомления
Подписаться на обновления (ID мода) - Подписаться на уведомления о загрузке обновления мода
Подписаться на новые моды - Подписаться на уведомления о загрузке новых модов
Подписаться на обновления модов -  Подписаться на уведомления о загрузке новых модов и их обновлений
Статистика загрузок (ID автора) - Статистика загрузок модов автора
===== Помощь =====`
))