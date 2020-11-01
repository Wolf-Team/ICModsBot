class ListenerList{
    sort = ICModsAPI.Sort.POPULAR;
    interval = 60000;

    constructor(sort, interval = 60000){
        if(sort !== undefined){
            if(!sort instanceof ICModsAPI.Sort)
                throw new TypeError("sort was been ICModsAPI.Sort");
                
            this.sort = sort;
        }
        if(interval !== undefined){
            if(!isInt(interval))
                throw new TypeError("interval was been Int");
                    
            this.interval = interval;
        }

        this._check = this._check.bind(this);
    }

    setListener(event){
        this._event = event;
        return this;
    }

    async _check(){
        let res = await ICModsAPI.list(this.sort, 0, 1);
        let new_timestamp = new Date(res[0].last_update).getTime();
        if(this.timestamp < new_timestamp){
            let timestemp = new_timestamp;

            let mods = await ICModsAPI.list(this.sort, 0, 20);
            for(let i = 0; i < 20 && timestemp > this.timestamp; i++){
                this._event(mods[i]);
            }
        }
    }

    async start(){
        let r = await ICModsAPI.list(this.sort, 0, 1);
        this.timestamp = new Date(r[0].last_update).getTime();
        this.mod = r[0].id;
        this.timer = setInterval(this._check, this.interval)
    }

    stop(){
        clearInterval(this.timer);
        this.timer = null;
    }

}