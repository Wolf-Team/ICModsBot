type Pattern = string | RegExp;
type Call<T> = (...args: any[]) => T;
export default class Command<Out = void> {
    private static list: NodeJS.Dict<Command<any>> = {};
    public static register<T = any>(name: string, pattern: Pattern, call: Call<T>) {
        const cmd: Command<T> = new Command(pattern, call);
        this.list[name.toLowerCase()] = cmd;
    }

    public static Find<T = any>(msg: string): Command<T> {
        for (var name in this.list) {
            const cmd = this.list[name];

            const args = msg.match(cmd.pattern);

            if (args != null)
                return this.list[name];
        }
        return null;
    }
    public static Invoke<T = any>(msg: string, ...gArgs: any[]): T {
        let cmd = this.Find<T>(msg);
        if (cmd)
            return cmd.Invoke(msg.match(cmd.pattern), ...gArgs)
    }

    private constructor(pattern: Pattern, call: Call<Out>) {
        if (typeof pattern == "string")
            this.pattern = new RegExp(`^${pattern}$`, "i");
        else
            this.pattern = pattern;

        this.call = call;
    }
    private pattern: RegExp = null;
    private call: Call<Out> = null;
    public Invoke(...args: any): Out {
        return this.call(...args);
    }
}