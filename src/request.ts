import http, { METHODS } from "http";
import https, { RequestOptions } from "https";
import { URL, URLSearchParams } from "url";
import fs from "fs";


export interface RequestDataFile {
    filename: string;
    mime?: string;
    content: Buffer | string
}
export type RequestData = NodeJS.Dict<string | RequestDataFile>;
type RequestHeader = string | number | string[];
interface RequestHeaders extends NodeJS.Dict<RequestHeader> { };

export enum RequestMethod {
    GET = "get", POST = "post"
}
enum RequestProtocol {
    HTTP = "http", HTTPS = "https"
}
type RequestURL = string | URL;
interface RequestSettings {
    url?: RequestURL;

    host?: string;
    protocol?: RequestProtocol;
    path?: string;

    method?: RequestMethod;
    data?: RequestData,

    headers?: RequestHeaders;
    encoding?: BufferEncoding | null;

    debug?: boolean
}
type Request = RequestSettings | RequestURL;

function getURL(request: RequestSettings) {
    if (request.url) {
        return request.url instanceof URL ? request.url : new URL(request.url);
    } else if (request.host) {
        if (!request.protocol) request.protocol = RequestProtocol.HTTPS;

        return new URL(`${request.protocol}://${request.host}/${request.path || ""}`);
    } else {
        throw new Error("Укажите хотя бы host или url");
    }
}

function random(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min)) + min;
}
function genStr(length: number = 12): string {
    const charset = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
    let str = "";
    for (; length > 0; length--)
        str += charset[random(0, 62)];
    return str;
}
const NEW_LINE = "\r\n";
class FormData {
    private boundary: string;
    private data: RequestData = {};

    constructor() {
        this.boundary = `-------------${genStr()}`;
    }

    append(name: string, data: string | RequestDataFile) {
        this.data[name] = data;
    }

    get length(): number {
        const bound_l = this.boundary.length;

        let length = 4 + bound_l;
        for (const field in this.data) {
            length += 49 + bound_l + field.length;

            const data = this.data[field];
            if (typeof data === "string") {
                length += data.length;
            } else {
                length += 29 + data.filename.length + data.content.length + (data.mime ? data.mime.length : 10);
            }
        }
        
        return length;
    }
    public getBoundary(): string {
        return this.boundary;
    }

    public toString(): string {
        let str = "";
        for (const field in this.data) {
            const data = this.data[field];

            str += `--${this.boundary}` + NEW_LINE + `Content-Disposition: form-data; name="${field}"`;

            if (typeof data !== "string")
                str += `; filename="${data.filename}"` + NEW_LINE + `Content-Type: ${data.mime || "text/plain"}`;

            str += NEW_LINE + NEW_LINE;
            if (typeof data !== "string") {
                if(data.content instanceof Buffer)
                    str += data.content.toString("binary");
                else
                    str += data.content;
            } else {
                str += data;
            }
            str += NEW_LINE;
        }
        str += `--${this.boundary}--`;

        return str;
    }
}

export default function request(url: string | URL): Promise<Buffer>;
export default function request(settings: RequestSettings & { encoding?: null }): Promise<Buffer>;
export default function request(settings: RequestSettings & { encoding: BufferEncoding }): Promise<string>;
export default function request(settings: Request): Promise<Buffer | string>;
export default function request(requestSettings: Request): Promise<Buffer | string> {
    if (typeof requestSettings == "string" || requestSettings instanceof URL)
        return request({ url: requestSettings });

    const debug = requestSettings.debug ? console.log : () => { };

    const have_file = requestSettings.data ? Object.keys(requestSettings.data).findIndex(e => typeof requestSettings.data[e] !== "string") != -1 : false;
    if (!requestSettings.headers) requestSettings.headers = {};

    if (!requestSettings.method)
        requestSettings.method = have_file ? RequestMethod.POST : RequestMethod.GET;

    if (have_file) {
        if (!requestSettings.headers.hasOwnProperty("Content-Type"))
            requestSettings.headers["Content-Type"] = "multipart/form-data";
        else if (requestSettings.headers["Content-Type"].toString().toLowerCase() != "multipart/form-data")
            throw new ReferenceError("For upload file use Content-Type: multipart/form-data");
    }
    const url: URL = getURL(requestSettings);
    let data: URLSearchParams | FormData;
    if (requestSettings.data) {
        if (requestSettings.headers["Content-Type"] && requestSettings.headers["Content-Type"].toString().toLowerCase() == "multipart/form-data"){
            data = new FormData();
            requestSettings.headers["Content-Type"] += `; boundary=${data.getBoundary()}`;
        }else
            data = new URLSearchParams(url.searchParams);

        for (const key in requestSettings.data) {
            const value = requestSettings.data[key];
            if (data instanceof FormData)
                data.append(key, value);
            else if (typeof value == "string")
                data.append(key, value);
        }

        if (requestSettings.method == RequestMethod.GET)
            url.search = data.toString();
    }


    const protocol = /^https/.test(url.protocol) ? https : http;
    const options: RequestOptions = {};

    options.headers = requestSettings.headers;
    options.headers["Host"] = url.host;
    options.method = requestSettings.method;

    if (requestSettings.method == RequestMethod.POST)
        options.headers["Content-Length"] = data instanceof FormData ? data.length : data.toString().length;

    return new Promise<Buffer | string>((r, e) => {
        const _request = protocol.request(url, options);
        _request.on("response", response => {
            debug("encoding:", requestSettings.encoding);

            if (requestSettings.encoding)
                response.setEncoding(requestSettings.encoding);

            const buffers = [];

            response.on("data", (chunk) => {
                debug("chunk:" + chunk);
                buffers.push(chunk);
            });
            response.on('end', () => {

                if (response.headers.location) {
                    requestSettings.url = response.headers.location;
                    r(request(requestSettings));
                }

                if (buffers[0] instanceof Buffer)
                    r(Buffer.concat(buffers));
                else
                    r(buffers.join(""));
            });
            response.on('error', e);
        });

        if (requestSettings.method == RequestMethod.POST)
            _request.write(data.toString(), "binary");

        _request.end();
    });
}