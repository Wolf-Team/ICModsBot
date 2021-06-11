import fs from "fs";
import ICModsAPI from "./ICModsAPI.js";

type DialogueList = { [key: number]: Dialogue };
interface PeersFollowingSettings {
    new?: true,
    author: number,
    mod: number
}
export default class Dialogue {
    private static __dialogues: DialogueList = {};
    private static readDB() {
        if (!fs.existsSync("dialogues.json")) return;
        let dialogues = JSON.parse(fs.readFileSync("dialogues.json", { encoding: "utf-8" }));

        for (let i in dialogues)
            Dialogue.get(parseInt(i)).parseObj(dialogues[i]);
    }
    public static writeDB() {
        fs.writeFile("dialogues.json", JSON.stringify(this.__dialogues), (err) => {
            if (err)
                console.log(err);
        });
    }
    public static init(time: number = 60000) {
        this.readDB();
        this.writeDB = this.writeDB.bind(this)
        setInterval(this.writeDB, time);
    }

    public static get(id: number) {
        if (!this.__dialogues[id])
            new this(id);

        return this.__dialogues[id];
    }

    public static getPeersFollowing(obj: PeersFollowingSettings): number[] {
        let arr: number[] = []

        for (let i in this.__dialogues) {
            let user = this.__dialogues[i];
            if (user.followingAllMods ||
                (obj.new && user.followingNewMods) ||
                (obj.author && user.followingAuthors.indexOf(obj.author) != -1) ||
                (obj.mod && user.followingMods.indexOf(obj.mod) != -1)
            )
                arr.push(parseInt(i));
        }

        return arr;
    }

    private lang: ICModsAPI.Lang = ICModsAPI.Lang.RU;
    private followingMods: number[] = [];
    private followingAuthors: number[] = [];
    private followingNewMods: boolean = false;
    private followingAllMods: boolean = false;

    constructor(id: number) {
        Dialogue.__dialogues[id] = this;
    }

    public setLang(lang: ICModsAPI.Lang) {
        this.lang = lang;
    }

    public followMod(mod: number) {
        if (this.followingMods.indexOf(mod) != -1)
            throw new Error(`The mod with ID ${mod} is already being in the subscriptions.`);

        this.followingMods.push(mod);
    }
    public unfollowMod(mod: number) {
        let i = this.followingMods.indexOf(mod);

        if (i == -1)
            throw new Error(`The mod with ID ${mod} was not found in the subscriptions.`);

        delete this.followingMods[i];
    }

    public followNewMods() {
        if (this.followingNewMods)
            throw new Error(`New mods are already being tracked.`);

        this.followingNewMods = true;
    }
    public unfollowNewMods() {
        if (!this.followingNewMods)
            throw new Error(`New mods are not tracked.`);

        this.followingNewMods = false;
    }

    public followAllMods() {
        if (this.followingAllMods)
            throw new Error(`All mods are already being tracked.`);

        this.followingAllMods = true;
    }
    public unfollowAllMods() {
        if (!this.followingAllMods)
            throw new Error(`All mods are not tracked.`);

        this.followingAllMods = false;
    }

    public followAuthor(author: number) {
        if (this.followingAuthors.indexOf(author) != -1)
            throw new Error(`The author with ID ${author} is already being in the subscriptions.`);

        this.followingAuthors.push(author);
    }
    public unfollowAuthor(author: number) {
        let i = this.followingAuthors.indexOf(author);

        if (i == -1)
            throw new Error(`The author with ID ${author} was not found in the subscriptions.`);

        delete this.followingAuthors[i];
    }

    private parseObj(obj) {
        for (let i in obj)
            this[i] = obj[i];
    }
}