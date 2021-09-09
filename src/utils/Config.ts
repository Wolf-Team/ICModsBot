import fs from 'fs';

export default class Config {
    private config: Object = {};

    private constructor() { }

    public get<T = any>(key: string, defaultValue?: T): T {
        if (this.config.hasOwnProperty(key))
            return this.config[key];

        if (key.indexOf(".") != -1) {
            const tree = key.split(".");
            const l = tree.length;
            let newKey = tree[0], i = 1;

            for (; !this.config.hasOwnProperty(newKey) && i != l; i++)
                newKey += "." + tree[i];

            const newCfg = this.config[newKey];

            if (typeof newCfg === "object")
                return Config.getFromObject(newCfg).get(tree.slice(i).join("."), defaultValue);
        }

        if (defaultValue === undefined)
            throw new Error(`The config does not have a "${key}" field.`);

        return defaultValue;
    }

    public static parseFromFile(file: string): Config {
        if (!/.+\.(json|conf(?:ig)?)/.test(file))
            file += ".conf";

        return this.getFromObject(JSON.parse(
            fs.readFileSync(file)
                .toString()
        ));
    }

    public static getFromObject(obj: Object): Config {
        const config = new Config();
        config.config = obj;
        return config;
    }
}