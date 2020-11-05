const app = express(), port = 20013;
app.use(express.json());

/** type             | params
  * mod_add           | mod_id
  * mod_update        | mod_id
  * comment_add       | mod_id, user_id, comment
  * 
  * mod_edit          | mod_id
  * icon_update       | mod_id
  * screenshot_add    | mod_id
  * screenshot_edit   | mod_id
  * screenshot_delete | mod_id
  * user_register     | user_id
**/

app.all("/hooks", function(req, res){
    if(!req.body || !req.body.type)
        return res.sendStatus(400);

    let mod;
    if(req.body.mod_id){
        mod = await ICModsAPI.getModInfo(mod.id);
        mod.description = (await ICModsAPI.listForIDs([mod.id]))[0].description;
    }

    switch(req.body.type){
        case "mod_add":
            let msg = printMod(mod, {
                title: "Загружен новый мод!",
                tags:true,
                github:true,
                multiplayer:true
            });

            let peers = Follow.getPeersFollowNew();
            for(let i in peers)
                VKAPI.invokeMethod("messages.send", {
                    random_id:0,
                    peer_id:peers[i],
                    message:msg
                });
        break;
        case "mod_update":
            let msg = printMod(mod, {
                title: "Доступно обновление мода!",
                tags:true,
                github:true,
                multiplayer:true,
                changelog:true
            });

            let peers = Follow.getPeersFollowMod(mod.id);
            for(let i in peers)
                VKAPI.invokeMethod("messages.send", {
                    random_id:0,
                    peer_id:peers[i],
                    message:msg
                });
        
            break;
        case "comment_add": break;

        case "mod_edit":
        case "icon_update":
        case "screenshot_add":
        case "screenshot_edit":
        case "screenshot_delete":
        case "user_register":
            return res.sendStatus(400);

        default:
            return res.sendStatus(400);
    }
	res.sendStatus(200);
});

app.listen(port, function(err){
    if (err) {
        throw err;
    }
    console.log(`Web севрер запущен на порту ${port}`);
});
