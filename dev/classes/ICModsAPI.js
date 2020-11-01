var ICModsAPI = {
    DEBUG:false,
    host:"https://icmods.mineprogramming.org/api/",
    horizon:true,
    Sort:function(sort){
        this.value = sort;
    },
    method:function(method, params = {}){
        if(ICModsAPI.DEBUG) console.log(method, params);

        if(typeof method != "string")
            throw new TypeError("method was been String");

        if(ICModsAPI.horizon)
            params.horizon = true;
            
        return request({
            url:ICModsAPI.host + method,
            method: "GET",
	    	json: true,
            qs:params
        });
    },
    
    description:function(id){
        if(!isInt(id))
            throw new TypeError("id was been Int");

        return ICModsAPI.method("description", {
            id:id
        });
    },
    list:function(sort, offset = 0, limit = 20){
        if(sort === undefined)
            sort = ICModsAPI.Sort.POPULAR;

        if(!sort instanceof ICModsAPI.Sort)
            throw new TypeError("sort was been ICModsAPI.Sort");

        if(!isInt(offset))
            throw new TypeError("offset was been Int");

        if(!isInt(limit))
            throw new TypeError("limit was been Int");
        
        return ICModsAPI.method("list", {
            sort:sort.value,
            start:offset,
            count:limit
        });
    },
    listForIDs:function(ids){
        if(!ids instanceof Array)
            throw new TypeError("ids was been Array<Int>");
        
        if(ids.findIndex(i => !isInt(i)) != -1)
            throw new TypeError("ids was been Array<Int>");

        return ICModsAPI.method("list", {
            ids:ids.join(",")
        });
    },
    searchModsFromAuthor:function(id){
        if(!isInt(id))
            throw new TypeError("id was been Int");

        return ICModsAPI.method("search", { author:id });
    },
    searchModsAtTag:function(tag){
        if(typeof tag != "string")
            throw new TypeError("tag was been String");
        return ICModsAPI.method("search", { tag:tag });
    },
    searchMods:function(query){
        if(typeof query != "string")
            throw new TypeError("query was been String");
        return ICModsAPI.method("search", { q:query });
    },
}

ICModsAPI.Sort.POPULAR = new ICModsAPI.Sort("popular");
ICModsAPI.Sort.NEW = new ICModsAPI.Sort("new");
ICModsAPI.Sort.REDACTION = new ICModsAPI.Sort("redaction");
ICModsAPI.Sort.UPDATED = new ICModsAPI.Sort("updated");


ICModsAPI.getModInfo = ICModsAPI.description;