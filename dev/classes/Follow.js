class Follow{
    all = false;
    new = false;
    ids = [];
    authors = [];

    constructor(user){
        Follow.__users[user] = this;
    }

    followAll(check = true){
        this.all = check;
    }

    followNew(check = true){
        this.new = check;
    }

    followAuthor(author){
        if(this.authors.indexOf(author) == -1)
        this.authors.push(author);
    }

    unfollowAuthor(author){
        let i = this.authors.indexOf(author);
        if(i != -1) delete this.authors[i];
    }

    followMod(id){
        if(this.ids.indexOf(id) == -1)
            this.ids.push(id);
    }

    unfollowMod(id){
        let i = this.ids.indexOf(id);
        if(i != -1) delete this.ids[i];
    }

    parseObj(obj){
        for(let i in obj)
            this[i] = obj[i];
    }
}
Follow.__users = {};
Follow.writeBD = function(){
    fs.writeFile("follows.json", JSON.stringify(Follow.__users), ()=>{});
}
Follow.readDB = function(){
    if(!fs.existsSync("follows.json")) return;
    let users = JSON.parse(fs.readFileSync("follows.json"))
    for(let i in users)
        Follow.getFor(i).parseObj(users[i]);
}
Follow.getFor = function(id){
    if(!Follow.__users[id])
        new Follow(id);

    return Follow.__users[id];
}
Follow.getPeersFollowAll = function(){
    let arr = [];
    
    for(let i in Follow.__users)
        if(Follow.__users[i].all)
            arr.push(i);

    return arr;
}
Follow.getPeersFollowNew = function(){
    let arr = []

    for(let i in Follow.__users)
        if(Follow.__users[i].all || Follow.__users[i].new)
            arr.push(i);

    return arr;
}
Follow.getPeersFollowMod = function(id){
    let arr = []

    for(let i in Follow.__users)
        if(Follow.__users[i].all || Follow.__users[i].ids.indexOf(id) != -1)
            arr.push(i);

    return arr;
}

Follow.readDB();
setTimeout(Follow.writeBD, 60000)
