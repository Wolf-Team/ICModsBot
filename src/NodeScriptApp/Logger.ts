import { closeSync, existsSync, mkdirSync, openSync, statSync, writeFileSync } from "fs";

class DateLog extends Date {
	public toLogDateString() {
		const month = this.getMonth() + 1;
		const day = this.getDate();
		return `${this.getFullYear()}.${month > 9 ? month : "0" + month}.${day > 9 ? day : "0" + day}`;
	}
	public toLogTimeString() {
		const h = this.getHours();
		const m = this.getMinutes();
		const s = this.getSeconds();
		return `${h > 9 ? h : "0" + h}:${m > 9 ? m : "0" + m}:${s > 9 ? s : "0" + s}`;
	}

	public toLogString() {
		return this.toLogDateString() + " " + this.toLogTimeString();
	}
}

enum LoggerType {
	ERROR = "E",
	MESSAGE = "M",
	WARNING = "W"
}

export default class Logger {
	private fileDescriptor: number;
	private dateOpen: DateLog;
	private readonly inFile: boolean;

	constructor(private readonly tag: string = "APP", private readonly folder: string = null) {
		this.inFile = folder != null;

		if (folder) {
			if (!existsSync(folder))
				mkdirSync(folder);
			else if (!statSync(folder).isDirectory())
				throw new Error(`Path ${folder} is not directory!`);

			this.openFile();
		}
	}

	private openFile() {
		if (this.fileDescriptor)
			this.closeFile();
		this.dateOpen = new DateLog();
		const fileName = `logs-${this.dateOpen.toLogDateString()}-${this.dateOpen.toLogTimeString().replace(/[\:]/g, ".")}.log`.replace(/[\\\/\|\:\*\?\"\<\>]/g, "_");
		this.fileDescriptor = openSync(`${this.folder}/${fileName}`, "a");
	}

	private closeFile() {
		closeSync(this.fileDescriptor);
		this.fileDescriptor = null;
	}

	private log(type: LoggerType, message: string, tag?: string) {
		const date = new DateLog();
		if (this.inFile && (date.getFullYear() != this.dateOpen.getFullYear() ||
			date.getMonth() != this.dateOpen.getMonth() ||
			date.getDate() != this.dateOpen.getDate()))
			this.openFile();

		const log = `[${type}][${date.toLogString()}][${tag || this.tag}] ${message}`;

		if (this.inFile)
			writeFileSync(this.fileDescriptor, log + "\r\n");

		switch (type) {
			case LoggerType.ERROR: console.error(log); break;
			case LoggerType.WARNING: console.warn(log); break;
			case LoggerType.MESSAGE: console.log(log); break;
		}
	}

	public Message(message: string, tag?: string) {
		this.log(LoggerType.MESSAGE, message, tag);
	}

	public Log(message: string, tag?: string) {
		this.Message(message, tag);
	}

	public Warning(message: string, tag?: string) {
		this.log(LoggerType.WARNING, message, tag);
	}
	public Warn(message: string, tag?: string) {
		this.Warning(message, tag);
	}

	public Error(message: string, tag?: string) {
		this.log(LoggerType.ERROR, message, tag);
	}


	public static readonly instance = new Logger("APP", process.send ? null : "./logs");
	public static readonly Message: (message: string, tag?: string) => void = Logger.instance.Message.bind(Logger.instance);
	public static readonly Log: (message: string, tag?: string) => void = Logger.instance.Log.bind(Logger.instance);
	public static readonly Warning: (message: string, tag?: string) => void = Logger.instance.Warning.bind(Logger.instance);
	public static readonly Warn: (message: string, tag?: string) => void = Logger.instance.Warn.bind(Logger.instance);
	public static readonly Error: (message: string, tag?: string) => void = Logger.instance.Error.bind(Logger.instance);
}
