import NodeVK, { GroupSession, NewMessageEvent } from "nodevk-ts";
import App from "./NodeScriptApp/App.js";
import Logger from "./NodeScriptApp/Logger.js";
import Config from "./utils/Config.js";
import ICModsListener, { CallbackServerConfig, ListenerServerConfig } from "./ICMods/ICModsListener.js";
import FollowersDB from "./ICMods/FollowersDB.js";
import ICModsAPI from "./ICModsAPI/ICModsAPI.js";
import { printComment, printMod, beautifyNumber } from "./utils/utils.js";
import Command from "./utils/Command.js";


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

class Application extends App {
	private _config: Config;
	private _icmodsListener: ICModsListener;
	private _vksession: GroupSession;
	private _db: FollowersDB;

	private get _admins() {
		return [this._config.get<number>("vk.owner"), ...this._config.get<number[]>("vk.admins", [])];
	}

	protected onShutdown(): void | Promise<void> {
		this._db.stop();
	}

	protected async onLaunch(): Promise<void> {
		this._config = Config.parseFromFile("config.json");

		this.registerDB();

		await Promise.all([
			this.registerVKSession(),
			new Promise(r => r(this.registerCommands())),
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
			const is_chat = NodeVK.isChat(message.peer_id);

			if (!is_chat && await this._vksession.groups.isMembers(this._config.get("vk.group_id"), message.from_id) == 0)
				return message.reply("Что бы использовать бота, подпишитесь на группу.");

			if (Command.TryInvoke(message.message, message, message.ClientInfo, message) == false && !is_chat)
				message.reply("Не понимаю тебя...\n\n" + HELP_TEXT);
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
			for (const peer of this._admins)
				this._vksession.messages.send(peer, `Добавлены скриншоты мода ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});
		this._icmodsListener.register("screenshot_edit", mod_id => {
			for (const peer of this._admins)
				this._vksession.messages.send(peer, `Изменены скриншоты мода ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});
		this._icmodsListener.register("screenshot_delete", mod_id => {
			for (const peer of this._admins)
				this._vksession.messages.send(peer, `Удалены скриншоты мода ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});

		this._icmodsListener.register("icon_update", mod_id => {
			for (const peer of this._admins)
				this._vksession.messages.send(peer, `Обновлена иконка мода ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});

		this._icmodsListener.register("mod_edit", mod_id => {
			for (const peer of this._admins)
				this._vksession.messages.send(peer, `Изменен мод ID: ${mod_id}
	
				Страница мода: https://icmods.mineprogramming.org/mod?id=${mod_id}
				Страница мода в админке: https://admin.mineprogramming.org/mod.php?id=${mod_id}`);
		});
	}

	async isAdminForChat(user: number, peer: number) {
		if (!NodeVK.isChat(peer))
			return true;

		let r = await this._vksession.invokeMethod("messages.getConversationsById", {
			peer_ids: NodeVK.getPeerIDForChat(peer)
		});
		if (r.error) throw r.error;
		if (r.response.count == 0) throw "no_perms";
		let sett = r.response.items[0].chat_settings;
		if (sett.owner_id == user) return true;
		return sett.admin_ids.indexOf(user) != -1;
	}

	registerCommands() {
		Command.register("ID", "(?:(?:\\/)?id|мод|mod)\\s([0-9]+)", async (args, msg) => {
			let mod = await ICModsAPI.description(parseInt(args[1]));

			if (mod.error || (mod.hidden && !this._db.get(msg.peer_id.toString()).isDon) || typeof mod == "string")
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

		Command.register("Подписаться на обновления", "(под|от)писаться\\s(?:на|от)\\sобновлени(?:я|й)\\s([0-9]+|модов)", async (args, msg, ci, api) => {
			try {
				if (!(await this.isAdminForChat(msg.from_id, msg.peer_id))) return;
			} catch (e) {
				if (e == "no_perms")
					e = "Для подписки на уведомления, боту нужны права администратора.";
				return msg.reply(e);
			}

			let id = parseInt(args[2]);
			let follow = args[1].toLowerCase() == "под";

			let follower = this._db.get(msg.peer_id.toString());
			let message = "";
			if (isNaN(id)) {
				if (follower.isDon) {
					message = "Вы не являетесь доном группы.";
				} else {
					if (follow) {
						try {
							follower.followAllMods();
							message = "Вы подписались на уведомления об обновлении всех модов.";
						} catch (e) {
							message = "Вы уже подписаны на уведомления об обновлении всех модов.";
						}
					} else {
						try {
							follower.unfollowAllMods();
							message = "Вы отписались от уведомлений об обновлении всех модов.";
						} catch (e) {
							message = "Вы не подписаны на уведомления об обновлении всех модов.";
						}
					}
				}
			} else {
				let mod = await ICModsAPI.description(id);
				if (mod.error || mod.enabled == 0 || typeof mod == "string") {
					message = `Мод с id ${id} не найден`;
				} else {
					if (follow) {
						try {
							follower.followMod(id);
							message = `Вы подписались на уведомления об обновлении ${mod.title}.`
						} catch (e) {
							message = `Вы уже подписаны на уведомления об обновлении ${mod.title}.`
						}
					} else {
						try {
							follower.unfollowMod(id);
							message = `Вы отписались от уведомлений об обновлении ${mod.title}.`
						} catch (e) {
							message = `Вы не подписаны на уведомления об обновлении ${mod.title}.`
						}
					}
				}
			}
			msg.reply(message);
		});

		Command.register("Подписаться на новые моды", "(под|от)писаться\\s(?:на|от)\\sновы(?:е|х)\\sмод(?:ы|ов)", async (args, msg, ci, api) => {
			try {
				if (!(await this.isAdminForChat(msg.from_id, msg.peer_id))) return;
			} catch (e) {
				if (e == "no_perms")
					e = "Для подписки на уведомления, боту нужны права администратора.";
				return msg.reply(e);
			}

			let follow = args[1].toLowerCase() == "под";

			let follower = this._db.get(msg.peer_id.toString());
			let message = "";
			if (follower.isDon) {
				message = "Вы не являетесь доном группы.";
			} else if (follow) {
				try {
					follower.followNewMods();
					message = "Вы подписались на уведомления о загрузке новых модов.";
				} catch (e) {
					message = "Вы уже подписаны на уведомления о загрузке новых модов.";
				}
			} else {
				try {
					follower.unfollowNewMods();
					message = "Вы отписались на уведомления о загрузке новых модов.";
				} catch (e) {
					message = "Вы не подписаны на уведомления о загрузке новых модов.";
				}
			}
			msg.reply(message);
		});

		Command.register("Подписаться на автора", "(под|от)писаться\\s(?:на|от)\\sавтора\\s([0-9]+)", async (args, msg, ci, api) => {
			try {
				if (!(await this.isAdminForChat(msg.from_id, msg.peer_id))) return;
			} catch (e) {
				if (e == "no_perms")
					e = "Для подписки на уведомления, боту нужны права администратора.";
				return msg.reply(e);
			}

			let id = parseInt(args[2]);
			let follow = args[1].toLowerCase() == "под";

			let follower = this._db.get(msg.peer_id.toString());
			if (follow) {
				try {
					follower.followAuthor(id);
					msg.reply("Вы подписались на автора.");
				} catch (e) {
					msg.reply("Вы уже подписаны на данного автора.");
				}
			} else {
				try {
					follower.unfollowAuthor(id);
					msg.reply("Вы отписались от автора.");
				} catch (e) {
					msg.reply("Вы не подписаны на данного автора.");
				}
			}
		});

		Command.register("Подписки", "подписки", async (args, msg) => {
			const follower = this._db.get(msg.peer_id.toString());
			if (follower.allMod)
				return msg.reply("Вы следите за всеми модами.");


			let mess = "";
			if (follower.newMod)
				mess = "Вы следите за загрузками новых модов\n";

			if (follower.mods.length > 0) {
				mess += "Вы следите за следующими модами:\n";
				let mods = await ICModsAPI.listForIDs(follower.mods);
				for (let i in mods) {
					let mod = mods[i];
					mess += `🔷 ${mod.title} - https://icmods.mineprogramming.org/mod?id=${mod.id}\n`;
				}
			}

			if (follower.authors.length > 0) {
				mess += "Вы следите за авторами:\n";
				for (let i in follower.authors) {
					let author = follower.authors[i];
					mess += `🔷 ${author} - https://icmods.mineprogramming.org/search?author=${author}\n`;
				}
			}

			if (mess == "")
				return msg.reply("Вы ни за чем не следите.");

			msg.reply(mess);
		});

		Command.register("Помощь", "(помощь|начать)", (a, msg) => msg.reply(HELP_TEXT));

		Command.register("/save", "\\/save", (a, msg) => {
			if (NodeVK.isChat(msg.peer_id) || msg.from_id != this._config.get("vk.owner")) return;

			this._db.writeDB();
			msg.reply("Записано, вырубай!");
		});

		Command.register("/tech", "\\/tech", (a, msg) => {
			if (msg.from_id != this._config.get("vk.owner")) return;
			msg.reply(`peer: ${msg.peer_id}
	
	from: ${msg.from_id}`);
		});

		Command.register("/test", "\\/test", (a, msg) => {
			if (this._config.get("vk.owner") == msg.from_id)
				msg.reply("Тестовая команда.");
		})
	}
}

new Application().launch();
