(new ListenerList())
.setInterval(10000)
.setOnNewMod(function(mod){
    let peers = Follow.getPeersFollowNew();
    for(let i in peers){
        VKAPI.invokeMethod("messages.send", {
            random_id:0,
            peer_id:peers[i],
            message:`Загружен новый мод!

${mod.title} [${mod.version_name}]

${mod.description}

Автор: ${mod.author_name}
Теги: ${mod.tags.join(", ")}

Страница мода: https://icmods.mineprogramming.org/mod?id=${mod.id}
Скачать мод: https://icmods.mineprogramming.org/api/download?id=${mod.id}`
        });
    }
})
.setOnUpdateMod(function(mod){
    let peers = Follow.getPeersFollowMod(mod.id);
    for(let i in peers){
        VKAPI.invokeMethod("messages.send", {
            random_id:0,
            peer_id:peers[i],
            message:`Доступно обновление мода!

${mod.title} [${mod.version_name}]

${mod.description}

Автор: ${mod.author_name}
Теги: ${mod.tags.join(", ")}
ChangeLog:
${mod.changelog}

Страница мода: https://icmods.mineprogramming.org/mod?id=${mod.id}
Скачать мод: https://icmods.mineprogramming.org/api/download?id=${mod.id}`
        });
    }
})
.start();