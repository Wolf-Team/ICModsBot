const request = require("request");

const fs = require("fs");

let peers = JSON.parse(fs.readFileSync("follows.json"));
let dialogues = {};
for(let i in peers){
    let peer = peers[i];
    dialogues[i] = {
        lang:"ru",
        followingMods:peer.ids,
        followingAuthors:peer.authors,
        followingNewMods:peer.new,
        followingAllMods:peer.all
    }
}
fs.writeFileSync("dialogues.json", JSON.stringify(dialogues));