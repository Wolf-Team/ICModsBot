import Config from "./classes/Config.js";
import Dialogue from "./classes/Dialogue.js";
import ICModsAPI from "./classes/ICModsAPI.js";
import Command, { API } from "./classes/Command.js";
import { beautifyNumber } from "./utils.js";

import NodeVK, { GroupSession, NewMessageEvent } from "nodevk-ts";

const __CONFIG__: Config = Config.parseFromFile("config.json");
const HIDDEN_ICON = __CONFIG__.get("vk.hidden_icon", "🔒");
const __ADMINS__: number[] = [__CONFIG__.get<number>("vk.owner"), ...__CONFIG__.get<number[]>("vk.admins", [])];
let __DONUTS__: number[] = __CONFIG__.get<number[]>("vk.donuts", []);

const HELP_TEXT = `===== Помощь =====
🔷 Мод (ID мода) - Вывести информацию о моде
🔷 Подписки - Информация о подписках на уведомления
🔷 Подписаться на обновления (ID мода) - Подписаться на уведомления о загрузке обновления мода
🔷 Подписаться на новые моды - Подписаться на уведомления о загрузке новых модов
🔷 Подписаться на обновления модов -  Подписаться на уведомления о загрузке новых модов и их обновлений
🔷 Подписаться на автора (ID автора) - Подписаться на уведомления о загрузке новых модов и их обновлений от автора
🔷 Статистика загрузок (ID автора) - Статистика загрузок модов автора
===== Помощь =====
🔗 Подробнее: https://vk.com/@icmodsbot-description`;

function isAdmin(user: number): boolean {
    return __ADMINS__.includes(user);
}

async function isAdminForChat(user_id: number, chat_id: number, api: API): Promise<boolean> {
    if (!NodeVK.isChat(chat_id))
        return true;

    let r = await api.invokeMethod("messages.getConversationsById", {
        peer_ids: NodeVK.getPeerIDForChat(chat_id)
    });
    if (r.error) throw r.error;
    if (r.response.count == 0) throw "no_perms";
    let sett = r.response.items[0].chat_settings;
    if (sett.owner_id == user_id) return true;
    return sett.admin_ids.indexOf(user_id) != -1;
}
function isDonut(user: number) {
    return isAdmin(user) || __DONUTS__.includes(user);
}

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
function printMod(mod: ICModsAPI.Mod, settings: PrintModSettings) {
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
    if (settings.multiplayer && mod.multiplayer == 1)
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
function printComment(settings: PrintCommentSettings) {
    return `Новый комментарий под модом ${settings.mod_title}!

👤 Автор ${settings.author}
- ${settings.comment}

📋 Страница мода: https://icmods.mineprogramming.org/mod?id=${settings.mod_id}`
}


function registerCommands() {
    Command.register("ID", "(?:(?:\\/)?id|мод|mod)\\s([0-9]+)", async function (args, msg) {
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

    Command.register("Statistic download", "Статистика\\sзагрузок\\s([0-9]+)", async function (args, msg) {
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

    Command.register("Подписаться на обновления", "(под|от)писаться\\s(?:на|от)\\sобновлени(?:я|й)\\s([0-9]+|модов)", async function (args, msg, ci, api) {
        try {
            if (!(await isAdminForChat(msg.from_id, msg.peer_id, api))) return;
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

    Command.register("Подписаться на новые моды", "(под|от)писаться\\s(?:на|от)\\sновы(?:е|х)\\sмод(?:ы|ов)", async function (args, msg, ci, api) {


        try {
            if (!(await isAdminForChat(msg.from_id, msg.peer_id, api))) return;
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

    Command.register("Подписаться на автора", "(под|от)писаться\\s(?:на|от)\\sавтора\\s([0-9]+)", async function (args, msg, ci, api) {
        try {
            if (!(await isAdminForChat(msg.from_id, msg.peer_id, api))) return;
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

    Command.register("Подписки", "подписки", async function (args, msg) {
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

    Command.register("Помощь", "(помощь|начать)", (a, msg) => msg.reply(HELP_TEXT));

    Command.register("/save", "\\/save", (a, msg) => {
        if (NodeVK.isChat(msg.peer_id) || msg.from_id != __CONFIG__.get("vk.owner")) return;

        Dialogue.writeDB();
        msg.reply("Записано, вырубай!");
    });

    Command.register("/tech", "\\/tech", (a, msg) => {
        if (msg.from_id != __CONFIG__.get("vk.owner")) return;
        msg.reply(`peer: ${msg.peer_id}
        
from: ${msg.from_id}`);
    });

    Command.register("/test", "\\/test", (a, msg) => {
        if (__CONFIG__.get("vk.owner") == msg.from_id)
            msg.reply("Тестовая команда.");
    })
}

async function main() {
    Dialogue.init(__CONFIG__.get("icmods.save_interval", 60000));
    registerCommands();

    const VKSession = new GroupSession(__CONFIG__.get<string>("vk.token"));
    const group_id = __CONFIG__.get<number>("vk.group_id");

    __DONUTS__.push(...(await VKSession.invokeMethod<{ items: number[] }>("groups.getMembers", {
        group_id: group_id,
        filter: "donut"
    })).response.items);

    VKSession.setSettingsLongPoll(group_id);
    VKSession.on("message_new", async function (message: NewMessageEvent) {
        const is_chat = NodeVK.isChat(message.peer_id);

        if (!is_chat && await VKSession.groups.isMembers(group_id, message.from_id) == 0)
            return message.reply("Что бы использовать бота, подпишитесь на группу.");

        if (Command.TryInvoke(message.message, message, message.ClientInfo, this) == false && !is_chat)
            message.reply("Не понимаю тебя...\n\n" + HELP_TEXT);
    });
    VKSession.on("donut_subscription_create", function (message) {
        __DONUTS__.push(message.user_id);
    });
    VKSession.on("donut_subscription_expired", function (message) {
        delete __DONUTS__[__DONUTS__.indexOf(message.user_id)];
    });
    VKSession.on("donut_subscription_cancelled", function (message) {
        delete __DONUTS__[__DONUTS__.indexOf(message.user_id)];
    });
    console.log("Запуск LongPoll.");
    VKSession.startLongPoll(() => console.log("LongPoll запущен."));


    const port = __CONFIG__.get<number>("icmods.callback_port", null);
    const timeout = __CONFIG__.get("icmods.listener_timeout", 60000);

    let Server: ICModsAPI.Server;
    let callback: () => void;
    if (port != null) {
        Server = new ICModsAPI.CallbackServer(port);
        callback = () => console.log(`Web севрер запущен на порту ${port}.`);
    } else {
        Server = new ICModsAPI.ListenerServer(timeout);
        callback = () => console.log(`Слушатель запущен с интервалом в ${timeout}мс.`);
    }

    Server.register("test", () => VKSession.messages.send(__CONFIG__.get("vk.owner"), "Тестовый хук"));
    Server.register("mod_add", async mod_id => {
        const mod = await ICModsAPI.getModInfo(mod_id);
        const msg = printMod(mod, {
            title: "Загружен новый мод!",
            tags: true,
            github: true,
            multiplayer: true
        });

        const peers = Dialogue.getPeersFollowing({
            author: mod.author,
            mod: mod.id,
            new: true
        });

        for (let i in peers)
            if (mod.enabled || isDonut(peers[i]))
                if (!NodeVK.isChat(peers[i]) && !VKSession.groups.isMembers(group_id, peers[i]))
                    VKSession.messages.send(peers[i], "Вы подписались на событие, но пропустили его. Подпишитесь на группу, что бы больше не пропускать события.");
                else
                    VKSession.messages.send(peers[i], msg);

    })
    Server.register("mod_update", async mod_id => {
        const mod = await ICModsAPI.getModInfo(mod_id);
        const msg = printMod(mod, {
            title: "Доступно обновление мода!",
            tags: true,
            github: true,
            multiplayer: true,
            changelog: true
        });

        const peers = Dialogue.getPeersFollowing({
            author: mod.author,
            mod: mod.id
        });
        for (let i in peers)
            if (mod.enabled || isDonut(peers[i]))
                if (!NodeVK.isChat(peers[i]) && !VKSession.groups.isMembers(group_id, peers[i]))
                    VKSession.messages.send(peers[i], "Вы подписались на событие, но пропустили его. Подпишитесь на группу, что бы больше не пропускать события.");
                else
                    VKSession.messages.send(peers[i], msg);
    });
    Server.register("comment_add", async (mod_id, user_id, comment) => {
        const mod = await ICModsAPI.getModInfo(mod_id);
        const msg = printComment({
            mod_title: mod.title,
            mod_id: mod.id,
            author: mod.comments[0].user,
            comment: comment
        });

        const peers = Dialogue.getPeersFollowing({
            author: mod.author,
            mod: mod.id
        });

        for (let i in peers)
            if (mod.enabled || isDonut(peers[i]))
                if (!NodeVK.isChat(peers[i]) && !VKSession.groups.isMembers(group_id, peers[i]))
                    VKSession.messages.send(peers[i], "Вы подписались на событие, но пропустили его. Подпишитесь на группу, что бы больше не пропускать события.");
                else
                    VKSession.messages.send(peers[i], msg);
    });

    Server.register("screenshot_add", mod_id => {
        for (const peer of __ADMINS__)
            VKSession.messages.send(peer, `Добавлены скриншоты мода ID: ${mod_id}
            
            Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
            Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
    });
    Server.register("screenshot_edit", mod_id => {
        for (const peer of __ADMINS__)
            VKSession.messages.send(peer, `Изменены скриншоты мода ID: ${mod_id}
            
            Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
            Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
    });
    Server.register("screenshot_delete", mod_id => {
        for (const peer of __ADMINS__)
            VKSession.messages.send(peer, `Удалены скриншоты мода ID: ${mod_id}
            
            Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
            Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
    });

    Server.register("icon_update", mod_id => {
        for (const peer of __ADMINS__)
            VKSession.messages.send(peer, `Обновлена иконка мода ID: ${mod_id}
            
            Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
            Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
    });

    Server.register("mod_edit", mod_id => {
        for (const peer of __ADMINS__)
            VKSession.messages.send(peer, `Изменен мод ID: ${mod_id}
            
            Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
            Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
    });

    Server.start(callback);
}

main();