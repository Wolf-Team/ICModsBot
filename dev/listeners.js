let newModsListener = new ListenerList(ICModsAPI.Sort.NEW, 10000);
newModsListener.setListener(function(mod){ console.log("New Mod", mod); }).start();

let updateModsListener = new ListenerList(ICModsAPI.Sort.UPDATED);
updateModsListener.setListener(function(mod){ console.log("Update Mod", mod); }).start();