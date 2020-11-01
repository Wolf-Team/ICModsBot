class ListenerList{
    sort = ICModsAPI.Sort.UPDATED;
    interval = 60000;

    constructor(sort, interval = 60000){
        if(sort !== undefined)
            this.setSort(sort);

        if(interval !== undefined)
            this.setInterval(interval);

        this._check = this._check.bind(this);
    }

    setInterval(interval){
        if(!isInt(interval))
            throw new TypeError("interval was been Int");
                
        this.interval = interval;
        return this;
    }
    setSort(sort){
        if(!sort instanceof ICModsAPI.Sort)
            throw new TypeError("sort was been ICModsAPI.Sort");
                
        this.sort = sort;
        return this;
    }

    OnNewMod(){}
    setOnNewMod(event){
        this.OnNewMod = event.bind(this);
        return this;
    }

    OnUpdateMod(){}
    setOnUpdateMod(event){
        this.OnUpdateMod = event.bind(this);
        return this;
    }

    async _check(){
        let checkMod = (await ICModsAPI.list(this.sort, 0, 1))[0];
        let new_timestemp = (new Date(checkMod.last_update)).getTime();
        if(this.timestemp < new_timestemp){
            let timestemp = new_timestemp, offset = 0;
            while(timestemp > this.timestemp){
                let mods = await ICModsAPI.list(this.sort, offset * 20, 20);
                
                for(let i = 0; i < 20; i++){
                    let mod = mods[i];
                    timestemp = (new Date(mod.last_update)).getTime();
                    if(timestemp <= this.timestemp) break;

                    let mod_info = await ICModsAPI.getModInfo(mod.id);
                    mod_info.description = mod.description;
                    if(mod_info.version == 1)
                        this.OnNewMod(mod_info);
                    else
                        this.OnUpdateMod(mod_info);
                }

                offset++;
            }
            this.timestemp = new_timestemp;
        }
    }

    _start(mod){
        this.timestemp = (new Date(mod.last_update)).getTime();
    }

    async start(){
        this._start((await ICModsAPI.list(this.sort, 0, 1))[0]);
        this.timer = setInterval(this._check, this.interval)
    }

    stop(){
        clearInterval(this.timer);
        this.timer = null;
    }
}