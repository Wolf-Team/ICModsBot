import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { writeFile } from "fs/promises";
import { parse } from "path";
import Logger from "../NodeScriptApp/Logger.js";

export default class FileDB<T extends FileDBObject> {
	private _db: { [key: string]: T } = {};
	protected readonly _tag = "FileDB";
	private _timer: NodeJS.Timeout;
	private _config: FileDBConfig<T>;

	public constructor(config: FileDBConfig<T>) {
		this._config = config;
	}

	public set(key: string, value: T) {
		this._db[key] = value;
	}

	public get(key: string): T {
		if (!this._db.hasOwnProperty(key))
			throw new RangeError();

		return this._db[key];
	}

	private writeFile() {
		writeFileSync(this._config.path, JSON.stringify(this._db), { encoding: "utf-8" });
	}

	private writeDB(): void {
		Logger.Log("Запись файла базы данных", this._tag);
		this.writeFile();
		Logger.Log("База данных сохранена", this._tag);
	}

	private readDB(): void {
		Logger.Log("Чтение файла базы данных", this._tag);
		if (!existsSync(this._config.path)) {
			mkdirSync(parse(this._config.path).dir, { recursive: true });
			Logger.Log("Файл базы данных не найден. Создание файла", this._tag);
			this.writeFile();
			Logger.Log("Файл базы данных создан", this._tag);
		}

		const db = JSON.parse(readFileSync(this._config.path, { encoding: "utf-8" }));
		for (let i in db)
			this.set(i, (() => {
				const el = new this._config._constructor();
				el.fromJSON(db[i]);
				return el;
			})())
		Logger.Log("База данных прочитана", this._tag);
	}

	public start() {
		this.readDB();
		this._timer = setInterval(() => this.writeDB(), this._config.timer);
	}

	public stop() {
		clearInterval(this._timer);
		this.writeDB();
	}

	public search(ex: (el: T) => boolean): T[] {
		let arr: T[] = [];

		for (const el of this)
			if (ex(el))
				arr.push(el);

		return arr;
	}

	public *[Symbol.iterator]() {
		for (let i in this._db)
			yield this._db[i];
	}
}

export interface FileDBObject<T = any> {
	toJSON(): T;
	fromJSON(json: T): void;
}

interface FileDBConfig<T extends FileDBObject> {
	path: string,
	timer?: number,
	_constructor: { new(): T }
}
