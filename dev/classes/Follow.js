class Follow{
    ids = [];

    constructor(user){
        Follow.__users[user] = this;
    }

    followAll(check = true){
        this.all = check;
    }

    add(id){
        if(this.ids.indexOf(id) == -1)
            this.ids.push(id);
    }

    remove(id){
        let i = this.ids.indexOf(id);
        if(i != -1) delete this.ids[i];
    }
}
Follow.__users = readBD("follows.json", {});
Follow.writeBD = function(){
    fs.writeFile("follows.json", JSON.stringify(Follow.__users), ()=>{});
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
Follow.getPeersFollowMod = function(id){
    let arr = []

    for(let i in Follow.__users)
        if(Follow.__users[i].all || Follow.__users[i].ids.indexOf(id) != -1)
            arr.push(i);

    return arr;
}

setTimeout(Follow.writeBD, 10 * 60000)
