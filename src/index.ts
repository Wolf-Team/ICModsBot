import NodeVK, { GroupSession, NewMessageEvent } from "nodevk-ts";
import App from "./NodeScriptApp/App.js";
import Logger from "./NodeScriptApp/Logger.js";
import Config from "./utils/Config.js";
import ICModsListener, { CallbackServerConfig, ListenerServerConfig } from "./ICMods/ICModsListener.js";
import FollowersDB from "./ICMods/FollowersDB.js";
import ICModsAPI from "./ICModsAPI/ICModsAPI.js";
import { printComment, printMod } from "./utils/utils.js";

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
		this._icmodsListener.register("test", () => this._vksession.messages.send(this._config.get("vk.owner"), "Тестовый хук"));

		this._icmodsListener.register("mod_add", async mod_id => {
			const mod = await ICModsAPI.getModInfo(mod_id);
			const msg = printMod(mod, {
				title: "Загружен новый мод!",
				tags: true,
				github: true,
				multiplayer: true
			});

			const followers = this._db.search(follower => {
				if (mod.hidden && !follower.isDon) return false;
				return follower.allMod && follower.isDon ||
					follower.newMod && follower.isDon ||
					follower.authors.indexOf(mod.author) != -1 ||
					follower.mods.indexOf(mod.id) != -1;
			});

			for (const follower of followers)
				if (!NodeVK.isChat(follower.id) && !this._vksession.groups.isMembers(this._config.get("vk.group_id"), follower.id))
					this._vksession.messages.send(follower.id, "Вы подписались на событие, но пропустили его. Подпишитесь на группу, что бы больше не пропускать события.");
				else
					this._vksession.messages.send(follower.id, msg);
		});

		this._icmodsListener.register("mod_update", async mod_id => {
			const mod = await ICModsAPI.getModInfo(mod_id);
			const msg = printMod(mod, {
				title: "Доступно обновление мода!",
				tags: true,
				github: true,
				multiplayer: true,
				changelog: true
			});

			const followers = this._db.search(follower => {
				if (mod.hidden && !follower.isDon) return false;
				return follower.allMod && follower.isDon ||
					follower.authors.indexOf(mod.author) != -1 ||
					follower.mods.indexOf(mod.id) != -1;
			});

			for (const follower of followers)
				if (!NodeVK.isChat(follower.id) && !this._vksession.groups.isMembers(this._config.get("vk.group_id"), follower.id))
					this._vksession.messages.send(follower.id, "Вы подписались на событие, но пропустили его. Подпишитесь на группу, что бы больше не пропускать события.");
				else
					this._vksession.messages.send(follower.id, msg);
		});
		this._icmodsListener.register("comment_add", async (mod_id, user_id, comment) => {
			const mod = await ICModsAPI.getModInfo(mod_id);
			const msg = printComment({
				mod_title: mod.title,
				mod_id: mod.id,
				author: mod.comments[0].user,
				comment: comment
			});

			const followers = this._db.search(follower => {
				if (mod.hidden && !follower.isDon) return false;
				return follower.allMod && follower.isDon ||
					follower.authors.indexOf(mod.author) != -1 ||
					follower.mods.indexOf(mod.id) != -1;
			});

			for (const follower of followers)
				if (!NodeVK.isChat(follower.id) && !this._vksession.groups.isMembers(this._config.get("vk.group_id"), follower.id))
					this._vksession.messages.send(follower.id, "Вы подписались на событие, но пропустили его. Подпишитесь на группу, что бы больше не пропускать события.");
				else
					this._vksession.messages.send(follower.id, msg);
		});

		this._icmodsListener.register("screenshot_add", mod_id => {
			for (const peer of [this._config.get<number>("vk.owner"), ...this._config.get<number[]>("vk.admins", [])])
				this._vksession.messages.send(peer, `Добавлены скриншоты мода ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});
		this._icmodsListener.register("screenshot_edit", mod_id => {
			for (const peer of [this._config.get<number>("vk.owner"), ...this._config.get<number[]>("vk.admins", [])])
				this._vksession.messages.send(peer, `Изменены скриншоты мода ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});
		this._icmodsListener.register("screenshot_delete", mod_id => {
			for (const peer of [this._config.get<number>("vk.owner"), ...this._config.get<number[]>("vk.admins", [])])
				this._vksession.messages.send(peer, `Удалены скриншоты мода ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});

		this._icmodsListener.register("icon_update", mod_id => {
			for (const peer of [this._config.get<number>("vk.owner"), ...this._config.get<number[]>("vk.admins", [])])
				this._vksession.messages.send(peer, `Обновлена иконка мода ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});

		this._icmodsListener.register("mod_edit", mod_id => {
			for (const peer of [this._config.get<number>("vk.owner"), ...this._config.get<number[]>("vk.admins", [])])
				this._vksession.messages.send(peer, `Изменен мод ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});
	}
}

new Application().launch();
