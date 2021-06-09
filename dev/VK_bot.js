VKAPI.AddEvent("message", function (msg, client_info) {
    Command.Invoke(msg.text, msg, client_info);
});

VKAPI.AddEvent("donut.subscribe", function (obj) {
    user_id = obj.user_id;
    donuts_users.push(user_id);
});

VKAPI.AddEvent("donut.expired", function (user_id) {
    delete donuts_users[donuts_users.indexOf(user_id)];
});

VKAPI.AddEvent("donut.cancelled", function (user_id) {
    delete donuts_users[donuts_users.indexOf(user_id)];
});