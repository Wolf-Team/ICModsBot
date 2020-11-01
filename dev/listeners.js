(new ListenerList())
.setInterval(10000)
.setOnNewMod(function(mod){
    console.log("New Mod", mod);
})
.setOnUpdateMod(function(mod){
    console.log("Update Mod", mod);
})
.start();