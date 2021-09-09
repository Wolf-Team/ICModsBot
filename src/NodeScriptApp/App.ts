import Logger from "./Logger.js"

export default abstract class App {
    public constructor() {
        process.on('message', (m) => {
            switch (m["action"]) {
                case "shutdown":
                    this.shutdown();
                    break;
            }
        });
    }

    protected send(message: any): void {
        if (process.send)
            process.send(message);
        else
            console.log("Attempt to send to parent process:", message);
    }

    protected abstract onShutdown(): void | Promise<void>;
    protected abstract onLaunch(): void | Promise<void>;

    public async launch() {
        Logger.Log("Launch application");
        try {
            await this.onLaunch();
        } catch (e) {
            Logger.Error(e.toString());
            this.shutdown(-1);
        }
        Logger.Log("Run application");
        this.send({ action: "set_state", state: "run" });
    }

    public async shutdown(code: number = 0) {
        Logger.Log("Shutdown application");
        this.send({ action: "set_state", state: "shutdown" });
        try {
            await this.onShutdown();
        } catch (e) {
            Logger.Error(e.toString());
            code = -2;
        }
        Logger.Log(`Stop application with code ${code}`);
        process.exit(code);
    }
}
