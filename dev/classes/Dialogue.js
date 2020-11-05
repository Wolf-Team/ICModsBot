class Dialogue{
    static __dialogues = {};
    static readDB(){
        if(!fs.existsSync("dialogues.json")) return;
        let dialogues = JSON.parse(fs.readFileSync("dialogues.json"))
        for(let i in dialogues)
            Dialogue.get(i).parseObj(dialogues[i]);
    }
    static writeDB(){
        fs.writeFile("dialogues.json", JSON.stringify(this.__dialogues), (err)=>{
            if(err){
                console.log(err);
            }else{
                console.log("Dialogues saved!");
            }
        });
    }
    static init(time = 60000){
        this.readDB();
        this.writeDB = this.writeDB.bind(this)
        setInterval(this.writeDB, time);
    }

    static get(id){
        if(!this.__dialogues[id])
            new this(id);

        return this.__dialogues[id];
    }
    static getPeersFollowing(obj){
        let arr = []
    
        for(let i in this.__dialogues){
            let user = this.__dialogues[i];
            if( user.followingAllMods ||
                (obj.new && user.followingNewMods) ||
                (obj.author && user.followingAuthors.indexOf(obj.author) != -1) ||
                (obj.mod && user.followingMods.indexOf(obj.mod) != -1)
            )
                arr.push(i);
        }
    
        return arr;
    }

    lang = "ru";
    followingMods = [];
    followingAuthors = [];
    followingNewMods = false;
    followingAllMods = false;
    
    constructor(id){
        Dialogue.__dialogues[id] = this;
    }

    setLang(lang){
        if(! (lang instanceof ICModsAPI.Lang))
            throw new TypeError();
        
        this.lang = lang;
    }

    followMod(mod){
        if(this.followingMods.indexOf(mod) != -1)
            throw new Error(`The mod with ID ${mod} is already being in the subscriptions.`);

        this.followingMods.push(mod);
    }
    unfollowMod(mod){
        let i = this.followingMods.indexOf(mod);
        
        if(i == -1)
            throw new Error(`The mod with ID ${mod} was not found in the subscriptions.`);

        delete this.followingMods[i];
    }

    followNewMods(){
        this.followingNewMods = true;
    }
    unfollowNewMods(){
        this.followingNewMods = false;
    }

    followAllMods(){
        this.followingAllMods = true;
    }
    unfollowAllMods(){
        this.followingAllMods = false;
    }

    followAuthor(author){
        if(this.followingAuthors.indexOf(author) != -1)
            throw new Error(`The author with ID ${author} is already being in the subscriptions.`);

        this.followingAuthors.push(author);
    }
    unfollowAuthor(author){
        let i = this.followingAuthors.indexOf(author);
        
        if(i == -1)
            throw new Error(`The author with ID ${author} was not found in the subscriptions.`);

        delete this.followingAuthors[i];
    }

    parseObj(obj){
        for(let i in obj)
            this[i] = obj[i];
    }
}
Dialogue.init(config.SaveDBInterval || 60000);