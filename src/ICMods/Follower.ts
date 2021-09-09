import { FileDBObject } from "../utils/FileDB.js";

interface IFollower {
	mods: number[];
	authors: number[];
	newMod: boolean;
	allMod: boolean;
	id: number;
}

export default class Follower implements IFollower, FileDBObject<IFollower> {
	private _mods: number[] = [];
	private _authors: number[] = [];
	private _newMod: boolean = false;
	private _allMod: boolean = false;
	private _id: number;


	public get mods() { return [...this._mods]; }
	public get authors() { return [...this._authors]; }
	public get newMod() { return this._newMod; }
	public get allMod() { return this._allMod; }
	public get id() { return this._id; }
	public isDon: boolean = false;

	public constructor(id?: number) {
		if (id) this._id = id;
	}

	public followMod(mod: number) {
		if (this._mods.indexOf(mod) != -1)
			throw new Error(`The mod with ID ${mod} is already being in the subscriptions.`);

		this._mods.push(mod);
	}
	public unfollowMod(mod: number) {
		const i = this._mods.indexOf(mod);

		if (i == -1)
			throw new Error(`The mod with ID ${mod} was not found in the subscriptions.`);

		delete this._mods[i];
	}

	public followAuthor(author: number) {
		if (this._authors.indexOf(author) != -1)
			throw new Error(`The author with ID ${author} is already being in the subscriptions.`);

		this._authors.push(author);
	}
	public unfollowAuthor(author: number) {
		const i = this._authors.indexOf(author);

		if (i == -1)
			throw new Error(`The author with ID ${author} was not found in the subscriptions.`);

		delete this._authors[i];
	}

	public followNewMods() {
		if (!this.isDon)
			throw new Error(`Follower ${this.id} is not Don.`);

		if (this._newMod)
			throw new Error(`New mods are already being tracked.`);

		this._newMod = true;
	}
	public unfollowNewMods() {
		if (!this._newMod)
			throw new Error(`New mods are not tracked.`);

		this._newMod = false;
	}

	public followAllMods() {
		if (!this.isDon)
			throw new Error(`Follower ${this.id} is not Don.`);

		if (this._allMod)
			throw new Error(`All mods are already being tracked.`);

		this._allMod = true;
	}
	public unfollowAllMods() {
		if (!this._allMod)
			throw new Error(`All mods are not tracked.`);

		this._allMod = false;
	}


	public toJSON(): IFollower {
		return {
			mods: this._mods,
			authors: this._authors,
			newMod: this.newMod,
			allMod: this.allMod,
			id: this.id
		};
	}
	public fromJSON(json: IFollower): void {
		this._mods = json.mods;
		this._authors = json.authors;
		this._newMod = json.newMod;
		this._allMod = json.allMod;
		this._id = json.id;
	}

}
