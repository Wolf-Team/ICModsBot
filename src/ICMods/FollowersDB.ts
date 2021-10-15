import FileDB from "../utils/FileDB.js";
import Follower from "./Follower.js";

export default class FollowersDB extends FileDB<Follower> {
	public constructor(timer: number) {
		super({
			path: "./db/dialogues.json",
			timer: timer,
			_constructor: Follower
		})
	}

	public get(key: string) {
		try {
			return super.get(key);
		} catch (e) {
			const newEl = new Follower(parseInt(key));
			this.set(key, newEl);
			return newEl;
		}
	}
}
