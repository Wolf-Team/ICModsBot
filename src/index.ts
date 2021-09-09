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

	protected async onLaunch(): Promise<void> {
		this._config = Config.parseFromFile("config.json");

		this.registerDB();

		await Promise.all([
			this.registerVKSession(),
			this.registerICModsListener()
		]);
	}

	registerDB() {
		this._db = new FollowersDB(this._config.get("db.save_interval"));
		Logger.Log("Запуск базы данных", "FollowersDB");
		this._db.start();
		Logger.Log("База данных запущена", "FollowersDB");
		this._config.get<number[]>("vk.donuts", []).forEach(e => this._db.get(e.toString()).isDon = true);
	}

	async registerVKSession() {
		const promises: Promise<any>[] = [];

		const groupId = this._config.get("vk.group_id"),
			token = this._config.get("vk.token");

		this._vksession = new GroupSession(token);
		this._vksession.setSettingsLongPoll(groupId);

		this.registerVKSessionEvents();

		promises.push(
			this._vksession.invokeMethod<{ items: number[] }>("groups.getMembers", {
				group_id: groupId,
				filter: "donut"
			}).then(
				r => r.response.items.forEach(
					e => this._db.get(e.toString()).isDon = true
				)
			)
		);

		Logger.Log("Запуск LongPoll.", "LongPoll");
		promises.push(new Promise((r, e) => {
			this._vksession.startLongPoll(() => r(Logger.Log("LongPoll запущен.", "LongPoll")));
		}));

		await Promise.all(promises);
	}

	async registerICModsListener() {
		let port = this._config.get("icmods.callback_port", null);
		this._icmodsListener = new ICModsListener(
			port ? new CallbackServerConfig(port) :
				new ListenerServerConfig(this._config.get("icmods.listener_timeout", 60000))
		);
		this.registerICModsListenerEvents();
		await new Promise<void>(r => this._icmodsListener.start(r));
	}


	registerVKSessionEvents() {
		this._vksession.on("message_new", async (message: NewMessageEvent) => {
			if (message.from_id == this._config.get("vk.owner"))
				message.reply("Ok");
		});

		this._vksession.on("donut_subscription_create", (message) => {
			this._db.get(message.user_id).isDon = true;
		});
		this._vksession.on("donut_subscription_expired", (message) => {
			this._db.get(message.user_id).isDon = false;
		});
		this._vksession.on("donut_subscription_cancelled", (message) => {
			this._db.get(message.user_id).isDon = false;
		});
	}

	registerICModsListenerEvents() {

	}
}

new Application().launch();
