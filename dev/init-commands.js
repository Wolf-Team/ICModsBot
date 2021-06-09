new Command("ID", "(?:(?:\\/)?id|мод|mod)\\s([0-9]+)", async function (args, msg) {
    let mod = await ICModsAPI.description(parseInt(args[1]));
    if (mod.error || (mod.hidden && !isDonut(msg.peer_id)) || typeof mod == "string")
        return msg.reply("Мод с данным ID не найден.");


    msg.reply(printMod(mod, {
        downloads: true,
        likes: true,
        last_update: true,
        tags: true,
        github: true,
        multiplayer: true
    }));
});

new Command("Statistic download", "Статистика\\sзагрузок\\s([0-9]+)", async function (args, msg) {
    let mods = await ICModsAPI.searchModsFromAuthor(parseInt(args[1]));
    if (mods.length == 0)
        return msg.reply("Моды автора не найдены.");

    let str = "";
    let downloads = 0;
    for (let i in mods) {
        let mod = await ICModsAPI.description(mods[i].id);
        str += `🔷 ${mod.title}: ${beautifyNumber(mod.downloads, " ")}\n`;
        downloads += mod.downloads;
    }
    str += "\n📥 Общее количество загрузок: " + beautifyNumber(downloads, " ");
    msg.reply(str);
});

new Command("Подписаться на обновления", "(под|от)писаться\\s(?:на|от)\\sобновлени(?:я|й)\\s([0-9]+|модов)", async function (args, msg) {
    try {
        if (!(await isAdmin(msg.from_id, msg.peer_id))) return;
    } catch (e) {
        if (e == "no_perms")
            e = "Для подписки на уведомления, боту нужны права администратора.";
        return msg.reply(e);
    }

    let id = parseInt(args[2]);
    let follow = args[1].toLowerCase() == "под";

    let following = Dialogue.get(msg.peer_id);
    let message = "";
    if (isNaN(id)) {
        if (follow) {
            try {
                following.followAllMods();
                message = "Вы подписались на уведомления об обновлении всех модов.";
            } catch (e) {
                message = "Вы уже подписаны на уведомления об обновлении всех модов.";
            }
        } else {
            try {
                following.unfollowAllMods();
                message = "Вы отписались от уведомлений об обновлении всех модов.";
            } catch (e) {
                message = "Вы не подписаны на уведомления об обновлении всех модов.";
            }
        }
    } else {
        let mod = await ICModsAPI.description(id);
        if (mod.error || mod.enabled == 0 || typeof mod == "string") {
            message = `Мод с id ${id} не найден`;
        } else {
            if (follow) {
                try {
                    following.followMod(id);
                    message = `Вы подписались на уведомления об обновлении ${mod.title}.`
                } catch (e) {
                    message = `Вы уже подписаны на уведомления об обновлении ${mod.title}.`
                }
            } else {
                try {
                    following.unfollowMod(id);
                    message = `Вы отписались от уведомлений об обновлении ${mod.title}.`
                } catch (e) {
                    message = `Вы не подписаны на уведомления об обновлении ${mod.title}.`
                }
            }
        }
    }
    msg.reply(message);
});

new Command("Подписаться на новые моды", "(под|от)писаться\\s(?:на|от)\\sновы(?:е|х)\\sмод(?:ы|ов)", async function (args, msg) {
    try {
        if (!(await isAdmin(msg.from_id, msg.peer_id))) return;
    } catch (e) {
        if (e == "no_perms")
            e = "Для подписки на уведомления, боту нужны права администратора.";
        return msg.reply(e);
    }

    let follow = args[1].toLowerCase() == "под";

    let following = Dialogue.get(msg.peer_id);
    let message = "";
    if (follow) {
        try {
            following.followNewMods();
            message = "Вы подписались на уведомления о загрузке новых модов.";
        } catch (e) {
            message = "Вы уже подписаны на уведомления о загрузке новых модов.";
        }
    } else {
        try {
            following.unfollowNewMods();
            message = "Вы отписались на уведомления о загрузке новых модов.";
        } catch (e) {
            message = "Вы не подписаны на уведомления о загрузке новых модов.";
        }
    }
    msg.reply(message);
});

new Command("Подписаться на автора", "(под|от)писаться\\s(?:на|от)\\sавтора\\s([0-9]+)", async function (args, msg) {
    try {
        if (!(await isAdmin(msg.from_id, msg.peer_id))) return;
    } catch (e) {
        if (e == "no_perms")
            e = "Для подписки на уведомления, боту нужны права администратора.";
        return msg.reply(e);
    }

    let id = parseInt(args[2]);
    let follow = args[1].toLowerCase() == "под";

    let following = Dialogue.get(msg.peer_id);
    if (follow) {
        try {
            following.followAuthor(id);
            msg.reply("Вы подписались на автора.");
        } catch (e) {
            msg.reply("Вы уже подписаны на данного автора.");
        }
    } else {
        try {
            following.unfollowAuthor(id);
            msg.reply("Вы отписались от автора.");
        } catch (e) {
            msg.reply("Вы не подписаны на данного автора.");
        }
    }
});

new Command("Подписки", "подписки", async function (args, msg) {
    let peer = Dialogue.get(msg.peer_id);
    if (peer.followingAllMods)
        return msg.reply("Вы следите за всеми модами.");


    let mess = "";
    if (peer.followingNewMods)
        mess = "Вы следите за загрузками новых модов\n";

    if (peer.followingMods.length > 0) {
        mess += "Вы следите за следующими модами:\n";
        let mods = await ICModsAPI.listForIDs(peer.followingMods);
        for (let i in mods) {
            let mod = mods[i];
            mess += `🔷 ${mod.title} - https://icmods.mineprogramming.org/mod?id=${mod.id}\n`;
        }
    }

    if (peer.followingAuthors.length > 0) {
        mess += "Вы следите за авторами:\n";
        for (let i in peer.followingAuthors) {
            let author = peer.followingAuthors[i];
            mess += `🔷 ${author} - https://icmods.mineprogramming.org/search?author=${author}\n`;
        }
    }

    if (mess == "")
        return msg.reply("Вы ни за чем не следите.");

    msg.reply(mess);
});

new Command("Помощь", "(помощь|начать)", (a, msg) => msg.reply(
    `===== Помощь =====
🔷 Мод (ID мода) - Вывести информацию о моде
🔷 Подписки - Информация о подписках на уведомления
🔷 Подписаться на обновления (ID мода) - Подписаться на уведомления о загрузке обновления мода
🔷 Подписаться на новые моды - Подписаться на уведомления о загрузке новых модов
🔷 Подписаться на обновления модов -  Подписаться на уведомления о загрузке новых модов и их обновлений
🔷 Подписаться на автора (ID автора) - Подписаться на уведомления о загрузке новых модов и их обновлений от автора
🔷 Статистика загрузок (ID автора) - Статистика загрузок модов автора
===== Помощь =====
🔗 Подробнее: https://vk.com/@icmodsbot-description`
))

new Command("/save", "\\/save", (a, msg) => {
    if (VKAPI.isChat(msg.peer_id) || msg.from_id != config.owner) return;

    Dialogue.writeDB();
    msg.reply("Записано, вырубай!");
});

new Command("/tech", "\\/tech", (a, msg) => {
    if (msg.from_id != config.owner) return;
    msg.reply(`peer: ${msg.peer_id}
    
from: ${msg.from_id}`);
});