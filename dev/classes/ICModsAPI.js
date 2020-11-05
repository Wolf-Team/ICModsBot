var ICModsAPI = {
    DEBUG:false,
    host:"https://icmods.mineprogramming.org/api/",
    horizon:true,
    defaultLang:"ru",
    Sort:function(sort){
        this.value = sort;
    },
    method:function(method, params = {}){
        if(ICModsAPI.DEBUG) console.log(method, params);

        if(typeof method != "string")
            throw new TypeError("method was been String");

        if(ICModsAPI.horizon)
            params.horizon = true;

        if(!params.lang)
            params.lang = ICModsAPI.defaultLang;
            
        return request({
            url:ICModsAPI.host + method,
            method: "GET",
	    	json: true,
            qs:params
        });
    },
    
    description:function(id, lang){
        if(!isInt(id))
            throw new TypeError("id was been Int");

        return ICModsAPI.method("description", {
            id:id,
            lang:lang
        });
    },
    list:function(sort, offset = 0, limit = 20, lang){
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
            count:limit,
            lang:lang
        });
    },
    listForIDs:function(ids, lang){
        if(!ids instanceof Array)
            throw new TypeError("ids was been Array<Int>");
        
        if(ids.findIndex(i => !isInt(i)) != -1)
            throw new TypeError("ids was been Array<Int>");

        return ICModsAPI.method("list", {
            ids:ids.join(","),
            lang:lang
        });
    },
    searchModsFromAuthor:function(id, lang){
        if(!isInt(id))
            throw new TypeError("id was been Int");

        return ICModsAPI.method("search", { author:id, lang:lang });
    },
    searchModsAtTag:function(tag, lang){
        if(typeof tag != "string")
            throw new TypeError("tag was been String");
        return ICModsAPI.method("search", { tag:tag, lang:lang });
    },
    searchMods:function(query, lang){
        if(typeof query != "string")
            throw new TypeError("query was been String");
        return ICModsAPI.method("search", { q:query, lang:lang });
    },
}

ICModsAPI.Sort.POPULAR = new ICModsAPI.Sort("popular");
ICModsAPI.Sort.NEW = new ICModsAPI.Sort("new");
ICModsAPI.Sort.REDACTION = new ICModsAPI.Sort("redaction");
ICModsAPI.Sort.UPDATED = new ICModsAPI.Sort("updated");


ICModsAPI.getModInfo = ICModsAPI.description;