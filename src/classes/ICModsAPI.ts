import request, { RequestData } from "./../request.js";
import { isInt } from "./../utils.js";
import express, { Express } from "express";

namespace ICModsAPI {
    const host: string = "https://icmods.mineprogramming.org/api/";
    const forHorizon: boolean = true;
    const DEBUG = false;

    export enum Lang {
        RU = "ru",
        EN = "en"
    }
    export enum Sort {
        POPULAR = "popular",
        NEW = "new",
        REDACTION = "redaction",
        UPDATED = "updated"
    }
    export interface IMethodParams {
        [key: string]: string | number | boolean | Array<string | number> | object
    }

    async function _request<T = any>(url: string, params: IMethodParams): Promise<T> {
        const data: RequestData = {};

        for (const field in params) {
            const value = params[field];

            if (Array.isArray(value)) {
                data[field] = value.join(",");
            } else if (typeof value == "object") {
                data[field] = JSON.stringify(value);
            } else if (typeof value !== "string") {
                data[field] = value.toString();
            } else {
                data[field] = value;
            }
        }

        return JSON.parse((await request({
            url: url,
            data: data,
            encoding: "utf-8"
        })));
    }

    const defaultLang = Lang.RU;
    function method<T>(method: string, params: IMethodParams = {}) {
        if (DEBUG) console.log(method, params);
        if (forHorizon) params.horizon = true;
        if (!params.lang) params.lang = defaultLang;

        return _request<T>(host + method, params);
    }

    export async function description(id: number, lang: Lang = null): Promise<Mod> {
        if (!isInt(id))
            throw new TypeError("id was been Int");

        let mod = await method<Mod>("description", {
            id: id,
            lang: lang
        });
        mod.hidden = mod.enabled == 0;
        mod.description = await (async () => {
            let mod = await listForIDs([id]);
            return mod[0] ? mod[0].description : "";
        })();
        return mod;
    }
    export const getModInfo = description;

    export function list(sort: Sort = Sort.POPULAR, offset: number = 0, limit: number = 20, lang: Lang = null): Promise<ModDescription[]> {
        if (!isInt(offset))
            throw new TypeError("offset was been Int");

        if (!isInt(limit))
            throw new TypeError("limit was been Int");

        return method<ModDescription[]>("list", {
            sort: sort,
            start: offset,
            count: limit,
            lang: lang
        });
    };

    export function listForIDs(ids: number[], lang: Lang = null): Promise<ModDescription[]> {
        if (ids.findIndex(i => !isInt(i)) != -1)
            throw new TypeError("ids was been Array<Int>");

        return method<ModDescription[]>("list", {
            ids: ids,
            lang: lang
        });
    }

    export function searchModsFromAuthor(id: number, lang: Lang = null): Promise<ModDescription[]> {
        if (!isInt(id))
            throw new TypeError("id was been Int");

        return method<ModDescription[]>("search", { author: id, lang: lang });
    }

    export function searchModsAtTag(tag: string, lang: Lang = null): Promise<ModDescription[]> {
        return method<ModDescription[]>("search", { tag: tag, lang: lang });
    }
    export function searchMods(query: string, lang: Lang = null): Promise<ModDescription[]> {
        return method<ModDescription[]>("search", { q: query, lang: lang });
    }


    export abstract class Server {
        private events: { [key: string]: ((...a: any[]) => void)[] } = {};
        public register(event: "test", call: () => void): void;
        public register(event: "mod_add" | "mod_update" | "screenshot_delete" | "screenshot_edit" | "screenshot_add" | "mod_edit" | "icon_update", call: (mod_id: number) => void): void;
        public register(event: "comment_add", call: (mod_id: number, user_id: number, comment: string) => void): void;
        public register(event: "user_register", call: (user_id: number) => void): void;

        public register(event: string, call: (...a: any[]) => void): void {
            if (!this.events.hasOwnProperty(event))
                this.events[event] = [];

            this.events[event].push(call);
        }

        public invoke(event: string, ...a: any[]) {
            const events = this.events[event]
            if (events)
                events.map(e => e(...a));
        }

        public abstract start(callback?: () => void): void;
    }
    export class CallbackServer extends Server {
        private app: Express;
        private port: number;

        constructor(port: number = 80) {
            super();
            this.port = port;

            this.app = express();
            this.app.use(express.json());
            this.app.all("/hooks", (req, res) => {
                if (!req.body || !req.body.type)
                    return res.sendStatus(400);

                let args: any[] = [];
                if (req.body.mod_id) args.push(req.body.mod_id);
                if (req.body.user_id) args.push(req.body.user_id);
                if (req.body.comment) args.push(req.body.comment);

                this.invoke(req.body.type, ...args);

                res.sendStatus(200);
            });
        }

        public start(callback?: () => void) {
            this.app.listen(this.port, callback);
        }
    }

    export class ListenerServer extends Server {
        private sort: Sort;
        private interval: number;
        private timer: NodeJS.Timeout;
        private lastTime: number;

        constructor(interval: number = 60000, sort: Sort = Sort.UPDATED) {
            if (!isInt(interval))
                throw new TypeError("interval was been Int");

            super();
            this.interval = interval;
            this.sort = sort;
            this.check = this.check.bind(this);
        }

        private async check() {
            let checkMod = (await ICModsAPI.list(this.sort, 0, 1))[0];
            let new_timestemp = (new Date(checkMod.last_update)).getTime();
            if (this.lastTime < new_timestemp) {
                let timestemp = new_timestemp, offset = 0;
                while (timestemp > this.lastTime) {
                    let mods = await ICModsAPI.list(this.sort, offset * 20, 20);

                    for (let i = 0; i < 20; i++) {
                        let mod = mods[i];
                        timestemp = (new Date(mod.last_update)).getTime();
                        if (timestemp <= this.lastTime) break;

                        if (mod.version == 1)
                            this.invoke("mod_new", mod.id);
                        else
                            this.invoke("mod_update", mod.id);
                    }

                    offset++;
                }
                this.lastTime = new_timestemp;
            }
        }

        public async start(callback?: () => void): Promise<void> {
            if (this.timer) return;

            this.lastTime = (new Date((await ICModsAPI.list(this.sort, 0, 1))[0].last_update)).getTime();
            this.timer = setInterval(this.check, this.interval)
            callback();
        }

        public stop() {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    export interface ModLink {
        link: string,
        name: string
    }
    export interface Comment {
        comment: string,
        user: string
    }

    export interface ModDescription {
        id: number,
        title: string,
        horizon_optimized: number,
        version: number,
        version_name: string,
        last_update: string,
        vip: number,
        pack: number,
        multiplayer: number,
        description: string,
        icon: string,
        likes: number
    }

    export interface Mod {
        id: number,
        title: string,
        version: number,
        version_name: string,
        filename: string,
        icon_full: string,
        screenshots: NodeJS.Dict<string>,
        github?: string,
        rate: number,
        author: number,
        downloads: number,
        changelog?: string,
        last_update: string,
        vip: number,
        pack: number,
        enabled: number,
        multiplayer: number,
        deprecated: number,
        description_full: string,
        tags: string[],
        links: ModLink[],
        likes: number,
        author_name: string,
        dependencies: number[],
        addons: number[],
        comments: Comment[],
        horizon_optimized: boolean,
        hidden: boolean,
        description?: string,
        error?: string
    }
}

export default ICModsAPI;
