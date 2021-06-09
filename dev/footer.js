async function main() {
    donuts_users = (await VKAPI.invokeMethod("groups.getMembers", {
        group_id: VKAPI.GROUP_ID,
        filter: "donut"
    })).items;

    VKAPI.Start();

    app.listen(port, function (err) {
        if (err) {
            throw err;
        }
        console.log(`Web севрер запущен на порту ${port}`);
    });
}

main();