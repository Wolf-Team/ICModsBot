import ICModsAPI from "../ICModsAPI/ICModsAPI.js";
import Logger from "../NodeScriptApp/Logger.js";

export default class ICModsListener {
	private _server: ICModsAPI.Server;
	private _config: CallbackServerConfig | ListenerServerConfig;

	public constructor(config: CallbackServerConfig | ListenerServerConfig) {
		if (config instanceof CallbackServerConfig)
			this._server = new ICModsAPI.CallbackServer(config.port);
		else
			this._server = new ICModsAPI.ListenerServer(config.interval, config.sort);

		this._config = config;
	}

	public register(event: "test", call: () => void): void;
	public register(event: "mod_add" | "mod_update" | "screenshot_delete" | "screenshot_edit" | "screenshot_add" | "mod_edit" | "icon_update", call: (mod_id: number) => void): void;
	public register(event: "comment_add", call: (mod_id: number, user_id: number, comment: string) => void): void;
	public register(event: "user_register", call: (user_id: number) => void): void;
	public register(event: string, call: (...a: any[]) => void): void {
		this._server.register(event, call);
	};

	public start(call: () => void = () => { }) {
		const isHttp = this._server instanceof ICModsAPI.CallbackServer;
		Logger.Log(isHttp ? "Запуск HTTP-сервера" : "Запуск слушателя", "ICModsListener");

		this._server.start(() => {
			call();
			Logger.Log(isHttp ?
				`HTTP-сервер запущен на порту ${(<CallbackServerConfig>this._config).port}` :
				`Слушатель запущен с интервалом ${(<ListenerServerConfig>this._config).interval}`, "ICModsListener"
			);
		})
	}
}


export class CallbackServerConfig { constructor(public readonly port: number = 80) { } }
export class ListenerServerConfig { constructor(public readonly interval: number = 60000, public readonly sort = ICModsAPI.Sort.UPDATED) { } }
