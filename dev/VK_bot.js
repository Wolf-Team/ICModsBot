VKAPI.AddEvent("message", function(msg, client_info){
    Command.Invoke(msg.text, msg, client_info);
});
VKAPI.Start();