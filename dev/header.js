const request = require('request-promise-native'),
      fs = require("fs");

function isInt(a){
    return typeof a == "number" && a == parseInt(a)
}

function beautifyNumber(n, point = ",") {
    n = n.toString();
    let str = "";
    for (let i = n.length - 1; i >= 0; i--) {
        str = n[i] + str;
        if ((n.length - i) % 3 === 0)
            str = point + str;
    }
    return str;
}

function readBD(file, def = {}){
	return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def;
}

async function isAdmin(user_id, chat_id){
	if(!VKAPI.isChat(chat_id))
		return true;
	
	let r = await VKAPI.invokeMethod("messages.getConversationsById", {
		peer_ids:VKAPI.getPeerIDfromChat(chat_id)
	});
	if(r.error) throw r.error;
	if(r.count == 0) throw "no_perms";
	let sett = r.items[0].chat_settings;
	if(sett.owner_id == user_id) return true;
	return sett.admin_ids.indexOf(user_id)!=-1;
}