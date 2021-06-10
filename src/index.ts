import Config from "./classes/Config.js";
import Dialogue from "./classes/Dialogue.js";
import ICModsAPI from "./classes/ICModsAPI.js";
import Command from "./classes/Command.js";

import { GroupSession } from "nodevk-ts";

const __CONFIG__: Config = Config.parseFromFile("config.json");
let __DONUTS__: number[] = [];
function isAdmin(user: number): boolean {
    return user == __CONFIG__.get("vk.owner") || __CONFIG__.get<number[]>("vk.admins", []).includes(user);
}
function isDonut(user: number) {
    return isAdmin(user) || __DONUTS__.includes(user);
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

    CallbackServer.start(__CONFIG__.get("icmods.callback_port", 80));
}

main();