import NodeVK, { GroupSession, NewMessageEvent } from "nodevk-ts";
import App from "./NodeScriptApp/App.js";
import Logger from "./NodeScriptApp/Logger.js";
import Config from "./utils/Config.js";
import ICModsListener, { CallbackServerConfig, ListenerServerConfig } from "./ICMods/ICModsListener.js";
import FollowersDB from "./ICMods/FollowersDB.js";

class Application extends App {
	private _config: Config;
	private _icmodsListener: ICModsListener;
	private _vksession: GroupSession;
	private _db: FollowersDB;

	protected onShutdown(): void | Promise<void> {
		// throw new Error("Method not implemented.");
	}

	protected onLaunch(): void | Promise<void> {
		this._config = Config.parseFromFile("config.json");

		this.registerDB();

		this.registerVKSession();

		this.registerICModsListener();

	}

	registerDB() {
		this._db = new FollowersDB(this._config.get("db.save_interval"));
		Logger.Log("Чтение базы данных", "FollowersDB");
		this._db.start();
		Logger.Log("База данных запущена", "FollowersDB");
	}

	registerVKSession() {
		const groupId = this._config.get("vk.group_id"),
			token = this._config.get("vk.token");

		this._vksession = new GroupSession(token);
		this._vksession.setSettingsLongPoll(groupId);

		this.registerVKSessionEvents();

		Logger.Log("Запуск LongPoll.", "LongPoll");
		this._vksession.startLongPoll(() => Logger.Log("LongPoll запущен.", "LongPoll"));
	}

	registerICModsListener() {
		let port = this._config.get("icmods.callback_port", null);
		this._icmodsListener = new ICModsListener(
			port ? new CallbackServerConfig(port) :
				new ListenerServerConfig(this._config.get("icmods.listener_timeout", 60000))
		);
		this.registerICModsListenerEvents();
		this._icmodsListener.start();
	}


	registerVKSessionEvents() {
		this._vksession.on("message_new", async (message: NewMessageEvent) => {
			if (message.from_id == this._config.get("vk.owner"))
				message.reply("Ok");
		});
	}

	registerICModsListenerEvents() {

	}
}

new Application().launch();
