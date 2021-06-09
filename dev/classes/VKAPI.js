var VKAPI = {
	URI_API: "https://api.vk.com/method/",
	GROUP_ID: null,
	TOKEN: null,
	VERSION: "5.115",
	DEBUG: false,
	TURN_UPLOAD_PHOTOS: false,

	/* Bot */
	_key: "",
	_server: "",

	_getServer: async function (ts = null, good = function () { }) {
		let response;
		try {
			response = await VKAPI.invokeMethod("groups.getLongPollServer", { group_id: VKAPI.GROUP_ID });
		} catch (err) {
			console.error("_getServer:\n\r", err); throw err;
		}
		VKAPI._key = response.key;
		VKAPI._server = response.server;
		console.log("LongPoll запущен.");
		good();
		VKAPI._getEvents(ts || response.ts);
	},
	_getEvents: async function (ts) {
		let response;
		try {
			response = await VKAPI.request(VKAPI._server, {
				act: "a_check",
				key: VKAPI._key,
				ts: ts,
				wait: 25
			});
		} catch (err) {
			if (err.error) {
				switch (err.error.code) {
					case "ENOTFOUND":
					case "ESOCKETTIMEDOUT":
						console.error("Ошибка подключения. Повторная попытка получить события через минуту.");
						return setTimeout(VKAPI._getEvents, 60000, ts);
						break;
					case "ETIMEDOUT":
						console.error("Долгое ожидание. Повторная попытка получить события.");
						return VKAPI._getEvents(ts);
						break;
					default:
						console.error("_getEvents(catch):\n\r", err);
						return stop();
						break;
				}
			} else {
				console.error("_getEvents(catch):\n\r", err);
				return stop();
			}
		}

		if (response.failed) {
			switch (response.failed) {
				case 1:
					console.error(`Failed: ${response.failed}. Bot works.`);
					VKAPI._getEvents(response.ts);
					break;
				case 2:
					console.error(`Failed: ${response.failed}. Bot restarted.`);
					VKAPI._getServer(ts);
					break;
				case 3:
					console.error(`Failed: ${response.failed}. Bot restarted.`);
					VKAPI._getServer();
					break;
				default:
					console.error(`Failed: ${response.failed}. Bot stoped.`);
					stop();
					break;
			}
			return;
		}
		response.updates.forEach(function (event) {
			switch (event.type) {
				case 'message_new':
					if (event.object.message.action) {
						if (VKAPI.DEBUG)
							console.log(event.object.message.action.type)

						VKAPI.InvokeEvent(event.object.message.action.type, event.object.message, event.object.message.action, event.object.client_info);
					} else {
						event.object.message.reply = function (message, attach = null, params = {}) {
							params.random_id = 0;
							params.peer_id = event.object.message.peer_id;
							params.message = message;
							if (attach)
								params.attachment = attach;
							return VKAPI.invokeMethod("messages.send", params);
						}
						if (event.object.message.payload)
							event.object.message.payload = JSON.parse(event.object.message.payload);

						event.object.message.text = event.object.message.text.replace(new RegExp("^(\\[club" + VKAPI.GROUP_ID + "\\|.+\\],*\\s*)", "i"), "")
						VKAPI.InvokeEvent("message", event.object.message, event.object.client_info);
					}
					break;
				case 'vkpay_transaction':
					VKAPI.InvokeEvent("vkpay", event.object);
					break;
				case 'wall_post_new':
					VKAPI.InvokeEvent("new_post", event.object);
					break;
				case "donut_subscription_create": VKAPI.InvokeEvent("donut.subscribe", event.object); break;
				case "donut_subscription_prolonged": VKAPI.InvokeEvent("donut.prolonged", event.object); break;
				case "donut_subscription_expired": VKAPI.InvokeEvent("donut.expired", event.object.user_id); break;
				case "donut_subscription_cancelled": VKAPI.InvokeEvent("donut.cancelled", event.object.user_id); break;
				default:
					VKAPI.InvokeEvent("native_" + event.type, event.object);
					break;
			}
		});

		VKAPI._getEvents(response.ts);
	},

	Start: function (good = function () { }) {
		if (this.GROUP_ID == null) return console.error("Не указан VKAPI.GROUP_ID");
		if (this.TOKEN == null) return console.error("Не указан VKAPI.TOKEN");

		if (this.GROUP_ID < 0)
			this.GROUP_ID *= -1;

		console.log("Запуск LongPoll.")
		VKAPI._getServer(null, good);
	},

	/* API */
	request: async function (url, params = {}, method = "GET") {
		let req = {
			method: method,
			json: true,
			uri: url,
		};
		if (method == "GET")
			req.qs = params
		else
			req.formData = params
		return await request(req);
	},
	invokeMethod: async function (method, params = {}) {
		if (!params["access_token"])
			params["access_token"] = VKAPI.TOKEN;
		if (!params["v"])
			params["v"] = VKAPI.VERSION;

		for (let i in params) {
			if (params[i] instanceof Array)
				params[i] = params[i].join(",");
			else if (typeof params[i] == "object")
				params[i] = JSON.stringify(params[i]);
		}

		let res;
		try {
			res = await VKAPI.request(VKAPI.URI_API + method, params);
		} catch (err) {
			switch (err.error.code) {
				case "ENOTFOUND":
				case "ESOCKETTIMEDOUT":
					console.error("Ошибка подключения. Повторная отправка " + method + " через минуту.");
					return await delayInvoke(60000, async () => {
						return await VKAPI.invokeMethod(method, params)
					});
					break;
				case "ETIMEDOUT":
					console.error("Долгое ожидание. Повторный отправка " + method + ".");
					return await VKAPI.invokeMethod(method, params);
					break;
				default:
					console.log(err);
					throw err;
					break;
			}
		}
		if (res.error)
			throw res.error;

		return res.response;
	},

	uploadPhoto: async function (image, peer_id = 0) {
		let UploadServer = await VKAPI.invokeMethod("photos.getMessagesUploadServer", { peer_id: peer_id });
		let res = await VKAPI.request(UploadServer.upload_url, {
			photo: {
				value: fs.createReadStream(image),
				options: {
					filename: path.basename(image).replace(/-/g, "_"),
					contentType: 'multipart/form-data'
				}
			}
		}, "POST");
		if (res.error)
			throw res.error;

		if (!res.photo) {
			console.error("Ошибка при загрузке " + image + " Повторная попытка.");
			return await VKAPI.uploadPhoto(image, peer_id);
		}

		try {
			res = await VKAPI.invokeMethod("photos.saveMessagesPhoto", res)
		} catch (e) {
			console.log("ERROR WITH FILE " + image);
			throw e;
		}
		return res[0];
	},
	uploadPhotos: async function (dir, files, peer_id = 0) {
		let c = files.length
		promises = [];

		for (let l = 0; l < c; l++)
			if (!VKAPI.TURN_UPLOAD_PHOTOS)
				promises.push(VKAPI.uploadPhoto(dir + "/" + files[l], peer_id))
			else
				promises.push(await VKAPI.uploadPhoto(dir + "/" + files[l], peer_id))

		if (!VKAPI.TURN_UPLOAD_PHOTOS)
			return await Promise.all(promises);
		else
			return promises;
	},

	uploadPhotoFromStream: async function (stream, filename, peer_id = 0) {
		let UploadServer = await VKAPI.invokeMethod("photos.getMessagesUploadServer", { peer_id: peer_id });
		let res = await VKAPI.request(UploadServer.upload_url, {
			photo: {
				value: stream,
				options: {
					filename: filename,
					contentType: 'multipart/form-data'
				}
			}
		}, "POST");
		if (res.error)
			throw res.error;

		if (!res.photo) {
			console.error(`Ошибка при загрузке ${filename}. Повторная попытка.`);
			return await VKAPI.uploadPhotoFromStream(stream, filename, peer_id);
		}

		try {
			res = await VKAPI.invokeMethod("photos.saveMessagesPhoto", res)
		} catch (e) {
			console.log(`ERROR WITH FILE ${filename}`);
			throw e;
		}
		return res[0];
	},

	/* System Events */
	_events: {},
	AddEvent: function (name, call) {
		if (!VKAPI._events.hasOwnProperty(name))
			VKAPI._events[name] = [];

		VKAPI._events[name].push(call);
	},

	InvokeEvent: function (name, ...args) {
		if (VKAPI._events.hasOwnProperty(name))
			VKAPI._events[name].forEach(function (call) { call(...args) });
	},


	/* Utils */
	isChat: function (id) {
		return id > 2000000000
	},
	getChatID: function (id) {
		if (VKAPI.isChat(id))
			id -= 2000000000;

		return id;
	},
	getPeerIDfromChat(id) {
		id = parseInt(id);
		if (!VKAPI.isChat(id))
			id += 2000000000;
		return id;
	},
	getGroupID: function (id) {
		if (id > 0)
			id *= -1;
		return id;
	}
};

VKAPI.AddEvent("message", function (message) {
	if (VKAPI.isChat(message.peer_id))
		VKAPI.InvokeEvent("chat.message", message);
	else
		VKAPI.InvokeEvent("user.message", message);
});