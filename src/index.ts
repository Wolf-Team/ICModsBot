import Config from "./classes/Config.js";
import Dialogue from "./classes/Dialogue.js";
import ICModsAPI from "./classes/ICModsAPI.js";
import Command from "./classes/Command.js";

import { GroupSession } from "nodevk-ts";

const __CONFIG__: Config = Config.parseFromFile("config.json");
const HIDDEN_ICON = __CONFIG__.get("vk.idden_icon", "🔒");
let __DONUTS__: number[] = [];

function isAdmin(user: number): boolean {
    return user == __CONFIG__.get("vk.owner") || __CONFIG__.get<number[]>("vk.admins", []).includes(user);
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

// 

async function main() {
    Dialogue.init(__CONFIG__.get("icmods.save_interval", 60000));

    const VKSession = new GroupSession(__CONFIG__.get<string>("vk.token"));
    const group_id = __CONFIG__.get<number>("vk.group_id");

    __DONUTS__ = (await VKSession.invokeMethod<{ items: number[] }>("groups.getMembers", {
        group_id: group_id,
        filter: "donut"
    })).response.items;

    VKSession.setSettingsLongPoll(group_id);
    VKSession.on("message_new", function (message) {
        return Command.Invoke(message.message, message, message.ClientInfo, this);
    });
    VKSession.startLongPoll();

    const CallbackServer: ICModsAPI.CallbackServer = new ICModsAPI.CallbackServer();

    CallbackServer.register("test", () => VKSession.messages.send(__CONFIG__.get("vk.owner"), "Тестовый хук"));
    CallbackServer.register("mod_add", async (mod_id) => {
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
                VKSession.messages.send(peers[i], msg);
    })
    CallbackServer.register("mod_update", async (mod_id) => {
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
                VKSession.messages.send(peers[i], msg);
    });
    CallbackServer.register("comment_add", async (mod_id, user_id, comment) => {
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
                VKSession.messages.send(peers[i], msg);
    });

    CallbackServer.start(__CONFIG__.get("icmods.callback_port", 80));
}

main();