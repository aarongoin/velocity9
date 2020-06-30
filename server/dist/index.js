'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var uws = require('uws');
var string_decoder = require('string_decoder');
var stream = require('stream');
var path = _interopDefault(require('path'));
var console = _interopDefault(require('console'));

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class RequestData extends stream.Readable {
    constructor(_source) {
        super();
        this._source = _source;
    }
    _startRead() {
        const emptyBuffer = Buffer.from([]);
        this._source((chunk, isLast) => {
            if (isLast) {
                this.push(chunk);
                this.push(null);
            }
            else {
                this.push(Buffer.concat([Buffer.from(chunk, 0, chunk.byteLength), emptyBuffer], chunk.byteLength), "utf8");
            }
        });
    }
    _read() {
        this._startRead();
    }
}
class AppRequest {
    constructor(req, body, remote) {
        this.headers = {};
        this.cookies = {};
        this.params = {};
        this.bodyUsed = false;
        this.data = null;
        this.req = req;
        this.body = new RequestData(body);
        this.remoteAddress = new string_decoder.StringDecoder("utf8").end(Buffer.from(remote));
        this.method = req.getMethod().toLocaleLowerCase();
        this.url = req.getUrl();
        for (const cookie of req.getHeader("cookie").split("; ")) {
            const [name, value] = cookie.split("=");
            this.cookies[name] = value;
        }
    }
    getHeader(name) {
        const lower = name.toLowerCase();
        if (this.headers[lower] === undefined)
            this.headers[lower] = this.req.getHeader(lower);
        return this.headers[lower];
    }
    getHeaders() {
        this.req.forEach((name, value) => {
            this.headers[name] = value;
        });
        return this.headers;
    }
    arrayBuffer(valid = true) {
        if (valid && this.data)
            return Promise.resolve(this.data);
        return new Promise(resolve => {
            let buffer = new Buffer(0);
            const len = +this.getHeader("Content-Length");
            if (!Number.isNaN(len) && len > 0) {
                let chunk;
                while (null !== (chunk = this.body.read())) {
                    buffer = Buffer.concat([chunk, buffer], buffer.byteLength + chunk.byteLength);
                }
            }
            this.bodyUsed = true;
            if (valid)
                this.data = buffer.buffer;
            resolve(buffer.buffer);
        });
    }
    text(valid = true) {
        if (valid && this.data)
            return Promise.resolve(this.data);
        return this.arrayBuffer(false).then(buffer => {
            const str = new string_decoder.StringDecoder("utf8").end(Buffer.from(buffer));
            if (valid)
                this.data = str;
            return str;
        });
    }
    json() {
        if (this.data)
            return Promise.resolve(this.data);
        return this.text(false).then(str => {
            try {
                this.data = JSON.parse(str);
            }
            catch (err) {
                throw err;
            }
            return this.data;
        });
    }
}

const statusMessage = {
    100: "100 Continue",
    101: "101 Switching Protocol",
    103: "103 Early Hints",
    200: "200 OK",
    201: "201 Created",
    202: "202 Accepted",
    203: "203 Non-Authoritative Information",
    204: "204 No Content",
    205: "205 Reset Content",
    206: "206 Partial Content",
    300: "300 Multiple Choice",
    301: "301 Moved Permanently",
    302: "302 Found",
    303: "303 See Other",
    304: "304 Not Modified",
    307: "307 Temporary Redirect",
    308: "308 Permanent Redirect",
    400: "400 Bad Request",
    401: "401 Unauthorized",
    402: "402 Payment Required",
    403: "403 Forbidden",
    404: "404 Not Found",
    405: "405 Method Not Allowed",
    406: "406 Not Acceptable",
    407: "407 Proxy Authentication Required",
    408: "408 Request Timeout",
    409: "409 Conflict",
    410: "410 Gone",
    411: "411 Length Required",
    412: "412 Precondition Failed",
    413: "413 Payload Too Large",
    414: "414 URI Too Long",
    415: "415 Unsupported Media Type",
    416: "416 Range Not Satisfiable",
    417: "417 Expectation Failed",
    418: "418 I'm a teapot",
    425: "425 Too Early",
    426: "426 Upgrade Required",
    428: "428 Precondition Required",
    429: "429 Too Many Requests",
    431: "431 Request Header Fields Too Large",
    451: "451 Unavailable For Legal Reasons",
    500: "500 Internal Server Error",
    501: "501 Not Implemented",
    502: "502 Bad Gateway",
    503: "503 Service Unavailable",
    504: "504 Gateway Timeout",
    505: "505 HTTP Version Not Supported",
    511: "511 Network Authentication Required"
};
const statusCode = {
    Continue: 100,
    SwitchingProtocol: 101,
    EarlyHints: 103,
    OK: 200,
    Created: 201,
    Accepted: 202,
    NonAuthoritativeInformation: 203,
    NoContent: 204,
    ResetContent: 205,
    PartialContent: 206,
    MultipleChoice: 300,
    MovedPermanently: 301,
    Found: 302,
    SeeOther: 303,
    NotModified: 304,
    TemporaryRedirect: 307,
    PermanentRedirect: 308,
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAllowed: 405,
    NotAcceptable: 406,
    ProxyAuthenticationRequired: 407,
    RequestTimeout: 408,
    Conflict: 409,
    Gone: 410,
    LengthRequired: 411,
    PreconditionFailed: 412,
    PayloadTooLarge: 413,
    URITooLong: 414,
    UnsupportedMediaType: 415,
    RangeNotSatisfiable: 416,
    ExpectationFailed: 417,
    ImaTeapot: 418,
    TooEarly: 425,
    UpgradeRequired: 426,
    PreconditionRequired: 428,
    TooManyRequests: 429,
    RequestHeaderFieldsTooLarge: 431,
    UnavailableForLegalReasons: 451,
    InternalServerError: 500,
    NotImplemented: 501,
    BadGateway: 502,
    ServiceUnavailable: 503,
    GatewayTimeout: 504,
    HTTPVersionNotSupported: 505,
    NetworkAuthenticationRequired: 511
};

const mimeTypes = {
    aac: "audio/aac",
    abw: "application/x-abiword",
    arc: "application/x-freearc",
    avi: "AVI: Audio Video Interleave	video/x-msvideo",
    azw: "application/vnd.amazon.ebook",
    bin: "application/octet-stream",
    bmp: "image/bmp",
    bz: "application/x-bzip",
    bz2: "application/x-bzip2",
    csh: "application/x-csh",
    css: "text/css",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    eot: "application/vnd.ms-fontobject",
    epub: "application/epub+zip",
    gz: "application/gzip",
    gif: "image/gif",
    htm: "text/html",
    html: "text/html",
    ico: "image/vnd.microsoft.icon",
    ics: "text/calendar",
    jar: "application/java-archive",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "text/javascript",
    json: "application/json",
    jsonld: "application/ld+json",
    mid: "audio/x-midi",
    midi: "audio/x-midi",
    mjs: "text/javascript",
    mp3: "audio/mpeg",
    mpeg: "video/mpeg",
    mpkg: "application/vnd.apple.installer+xml",
    odp: "application/vnd.oasis.opendocument.presentation",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    odt: "application/vnd.oasis.opendocument.text",
    oga: "audio/ogg",
    ogv: "video/ogg",
    ogx: "application/ogg",
    opus: "audio/opus",
    otf: "font/otf",
    png: "image/png",
    pdf: "application/pdf",
    php: "application/x-httpd-php",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    rar: "application/vnd.rar",
    rtf: "application/rtf",
    sh: "application/x-sh",
    svg: "image/svg+xml",
    swf: "application/x-shockwave-flash",
    tar: "application/x-tar",
    tif: "image/tiff",
    tiff: "image/tiff",
    ts: "video/mp2t",
    ttf: "font/ttf",
    txt: "text/plain",
    vsd: "application/vnd.visio",
    wav: "audio/wav",
    weba: "audio/webm",
    webm: "video/webm",
    webp: "image/webp",
    woff: "font/woff",
    woff2: "font/woff2",
    xhtml: "application/xhtml+xml",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xml: "application/xml",
    xul: "application/vnd.mozilla.xul+xml",
    zip: "application/zip",
    "3gp": "video/3gpp",
    "3g2": "video/3gpp2",
    "7z": "application/x-7z-compressed"
};

function cookie(name, value, options) {
    if (options === null)
        return `${name}=${value}`;
    let attributes = "";
    if (options.expires)
        attributes = `${attributes}; Expires=${options.expires}`;
    if (options.maxAge)
        attributes = `${attributes}; Max-Age=${options.maxAge}`;
    if (options.path)
        attributes = `${attributes}; Path=${options.path}`;
    if (options.domain)
        attributes = `${attributes}; Domain=${options.domain}`;
    if (options.sameSite)
        attributes = `${attributes}; SameSite=${options.sameSite === "lax" ? "Lax" : "Strict"}`;
    if (options.httpOnly)
        attributes = `${attributes}; HttpOnly`;
    if (options.secure)
        attributes = `${attributes}; Secure`;
    return attributes ? `${name}=${value}; ${attributes}` : `${name}=${value}`;
}
class ResponseData extends stream.Writable {
    constructor(_sink) {
        super();
        this._sink = _sink;
    }
    _write(chunk, _, cb) {
        this._sink.write(chunk);
        cb(null);
    }
}
class AppResponse {
    constructor(res) {
        this.statusCode = 200;
        this.headers = {};
        this.cookies = {};
        this.open = true;
        this.close = null;
        this.res = res;
        this.body = new ResponseData(res);
        this.done = new Promise(resolve => {
            this.close = resolve;
        });
        this.res.onAborted(() => {
            this.open = false;
            if (this.close)
                this.close("aborted");
        });
    }
    writeHeaders() {
        for (const [header, value] of Object.entries(this.headers))
            this.res.writeHeader(header, value);
    }
    writeCookies() {
        for (const [name, [value, options]] of Object.entries(this.cookies))
            this.res.writeHeader("Set-Cookie", cookie(name, value, options));
    }
    finalizeHeader() {
        this.res.writeStatus(statusMessage[this.statusCode]);
        this.writeHeaders();
        this.writeCookies();
    }
    setHeader(name, value) {
        this.headers[name] = value;
        return this;
    }
    setHeaders(headers) {
        for (const [name, value] of Object.entries(headers))
            this.headers[name] = value;
        return this;
    }
    setCookie(name, value, options = null) {
        this.cookies[name] = [value, options];
        return this;
    }
    status(code) {
        if (process.env.NODE_ENV === "development") {
            if (!statusMessage[code])
                throw new Error(`No response exists for status code ${code}`);
        }
        this.statusCode = code;
        return this;
    }
    sendStatus(code) {
        if (process.env.NODE_ENV === "development") {
            if (!statusMessage[code])
                throw new Error(`No response exists for status code ${code}`);
        }
        this.statusCode = code;
        this.end();
    }
    attach(filepath) {
        const filename = path.extname(filepath);
        this.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
        this.headers["Content-Type"] =
            mimeTypes[filename.split(".")[1] || "bin"] || "application/octet-stream";
    }
    redirect(path) {
        this.headers["Redirect"] = path || "/";
        this.end();
    }
    json(body) {
        const json = JSON.stringify(body);
        this.headers["Content-Type"] = "application/json";
        this.send(json);
    }
    send(body) {
        this.open = false;
        this.res.cork(() => {
            this.finalizeHeader();
            this.res.end(body);
        });
    }
    end() {
        this.finalizeHeader();
        this.open = false;
        this.res.close();
        if (this.close)
            this.close("sent");
    }
}

function Int(name, optional) {
    return (value) => {
        if (value === null && optional)
            return null;
        if (!value || value.includes("."))
            throw new Error(`Expected parameter ${name} to be an integer.`);
        else
            return Number.parseInt(value, 10);
    };
}
function Float(name, optional) {
    return (value) => {
        if (value === null && optional)
            return null;
        if (!value)
            throw new Error(`Expected parameter ${name} to be a number.`);
        const parsed = Number.parseFloat(value);
        if (Number.isNaN(parsed))
            throw new Error(`Expected parameter ${name} to be a number.`);
        return parsed;
    };
}
function Bool(name, optional) {
    return (value) => {
        if (value === null && optional)
            return null;
        if (value === "true")
            return true;
        if (value === "false")
            return false;
        throw new Error(`Expected parameter ${name} to be a boolean.`);
    };
}
function Any(value) {
    return value;
}
function AnyValue() {
    return Any;
}
function StringLiteral(name, optional, values) {
    if (process.env.NODE_ENV === "development") {
        if (values.length === 0)
            throw new Error(`Expected string literal values to check parameter ${name} against. If any string would be valid then use: {${name}:string}`);
    }
    return (value) => {
        if (value === null && optional)
            return null;
        for (const possible of values)
            if (value === possible)
                return value;
        throw new Error(`Expected parameter ${name} to be one of: ${values.join(" | ")}`);
    };
}
function NumberLiteral(name, optional, values) {
    return (value) => {
        if (value === null && optional)
            return null;
        if (value)
            for (const possible of values)
                if (+value === possible)
                    return +value;
        throw new Error(`Expected parameter ${name} to be one of: ${values.join(" | ")}`);
    };
}
function Regex(name, optional, regex) {
    return (value) => {
        if (value === null && optional)
            return null;
        regex.lastIndex = 0;
        if (value && regex.test(value))
            return value;
        throw new Error(`Expected parameter ${name} to match ${regex.toString()}`);
    };
}
function Custom(name, type, optional) {
    if (type.startsWith("/")) {
        const [, pattern, flags] = type.split("/");
        return Regex(name, optional, new RegExp(pattern, flags));
    }
    const literals = type.split("|");
    if (!literals.filter(v => !Number.isNaN(Number.parseFloat(v))).length)
        return NumberLiteral(name, optional, literals.map(v => +v));
    return StringLiteral(name, optional, literals);
}
const basicValidators = {
    int: Int,
    number: Float,
    bool: Bool,
    string: AnyValue,
    any: AnyValue
};

function write(level, message) {
    const timestamp = new Date().toISOString();
    switch (level) {
        case "info":
            return console.info(`[${timestamp}]      INFO:  ${message}`);
        case "warning":
            return console.warn(`[${timestamp}]   WARNING:  ${message}`);
        case "error":
            return console.error(`[${timestamp}]     ERROR:  ${message}`);
        case "critical":
            return console.error(`[${timestamp}]  CRITICAL:  ${message}`);
    }
}
const log = {
    info: (message) => {
        setTimeout(write, 0, "info", message);
    },
    warning: (message) => {
        setTimeout(write, 0, "warning", message);
    },
    error: (message) => {
        setTimeout(write, 0, "error", message);
    },
    critical: (message) => {
        setTimeout(write, 0, "critical", message);
    }
};

function defer(fn) {
    setTimeout(fn, 0);
}

function Parser(url) {
    const [pathname, params] = url.split("?");
    const url_params = [];
    for (const part of pathname.split("/")) {
        if (part.startsWith("{")) {
            const [name, type = "any"] = part
                .substring(1, part.length - 1)
                .split(":");
            const validate = basicValidators[type]
                ? basicValidators[type](name, false)
                : Custom(name, type, false);
            url_params.push([name, validate]);
        }
        else if (part.startsWith(":"))
            url_params.push([part.substring(1), Any]);
    }
    const query_params = [];
    for (const query of params.split(",")) {
        if (query.startsWith("{")) {
            const [name, type = "any"] = query
                .substring(1, query.length - 1)
                .split(":");
            const validate = basicValidators[type]
                ? basicValidators[type](name, true)
                : Custom(name, type, true);
            query_params.push([name, validate]);
        }
        else
            query_params.push([name, Any]);
    }
    return ({ req, next }) => {
        const params = {};
        const q = new URLSearchParams(req.req.getQuery());
        for (const [name, validate] of query_params)
            params[name] = validate(q.get(name));
        for (const i in url_params) {
            const [name, validate] = url_params[i];
            params[name] = validate(req.req.getParameter(+i));
        }
        req.params = params;
        next();
    };
}
function routeUrl(pattern) {
    let useParser = false;
    const [path, params] = pattern.split("?");
    const url = path
        .split("/")
        .map(part => {
        if (part.startsWith("{")) {
            useParser = true;
            return `:${part.split(":")[0].substring(1)}`;
        }
        if (part.startsWith(":"))
            useParser = true;
        return part;
    })
        .join("/");
    if (params)
        useParser = true;
    return [url, useParser];
}
function applyMiddleware(middlewares, context) {
    return (handler) => {
        let done = true;
        const next = () => {
            done = false;
        };
        return (baseRes, baseReq) => __awaiter(this, void 0, void 0, function* () {
            const res = new AppResponse(baseRes);
            const req = new AppRequest(baseReq, baseRes.onData, baseRes.getRemoteAddress());
            const payload = Object.assign(Object.assign({}, context), { res,
                req,
                next });
            if (!middlewares.length)
                return handler(payload);
            try {
                for (const middleware of middlewares) {
                    done = true;
                    yield middleware(payload);
                    if (done)
                        return;
                }
                handler(payload);
            }
            catch (err) {
                res.sendStatus(statusCode.InternalServerError);
                log.error(err);
            }
        });
    };
}
function route(app, context, middlewares) {
    return (pattern) => {
        const [url, useParser] = routeUrl(pattern);
        if (useParser)
            middlewares.push(Parser(pattern));
        const routeMiddleware = applyMiddleware(middlewares, context);
        const used = {};
        const methods = {
            use: (middleware) => {
                middlewares.push(middleware);
                return methods;
            },
            any: (handler) => {
                used.any = true;
                app.any(url, routeMiddleware(handler));
            },
            get: (handler) => {
                if (process.env.NODE_ENV === "development") {
                    if (used.get)
                        throw new Error(`Duplicate 'get' method for route: ${url}`);
                    used.get = true;
                }
                app.get(url, routeMiddleware(handler));
                return methods;
            },
            post: (handler) => {
                if (process.env.NODE_ENV === "development") {
                    if (used.post)
                        throw new Error(`Duplicate 'post' method for route: ${url}`);
                    used.post = true;
                }
                app.post(url, routeMiddleware(handler));
                return methods;
            },
            put: (handler) => {
                if (process.env.NODE_ENV === "development") {
                    if (used.put)
                        throw new Error(`Duplicate 'put' method for route: ${url}`);
                    used.put = true;
                }
                app.put(url, routeMiddleware(handler));
                return methods;
            },
            del: (handler) => {
                if (process.env.NODE_ENV === "development") {
                    if (used.delete)
                        throw new Error(`Duplicate 'del' method for route: ${url}`);
                    used.delete = true;
                }
                app.del(url, routeMiddleware(handler));
                return methods;
            },
            head: (handler) => {
                if (process.env.NODE_ENV === "development") {
                    if (used.head)
                        throw new Error(`Duplicate 'head' method for route: ${url}`);
                    used.head = true;
                }
                app.head(url, routeMiddleware(handler));
                return methods;
            },
            options: (handler) => {
                if (process.env.NODE_ENV === "development") {
                    if (used.options)
                        throw new Error(`Duplicate 'options' method for route: ${url}`);
                    used.options = true;
                }
                app.options(url, routeMiddleware(handler));
                return methods;
            },
            trace: (handler) => {
                if (process.env.NODE_ENV === "development") {
                    if (used.trace)
                        throw new Error(`Duplicate 'trace' method for route: ${url}`);
                    used.trace = true;
                }
                app.trace(url, routeMiddleware(handler));
                return methods;
            }
        };
        defer(() => !used.any &&
            app.any(url, (res) => res.writeStatus(statusMessage[statusCode.MethodNotAllowed])));
        return methods;
    };
}

function catchAll({ res, req }) {
    switch (req.method) {
        case "get":
        case "put":
        case "post":
        case "patch":
        case "delete":
        case "trace":
        case "head":
            return res.sendStatus(statusCode.NotFound);
        default:
            return res.sendStatus(statusCode.NotImplemented);
    }
}
class App {
    constructor({ ssl } = {}) {
        this.listenSocket = null;
        this.context = {};
        this.attachments = [];
        this.middlewares = [];
        this.core = ssl ? uws.SSLApp(ssl) : uws.App();
        process.once("SIGINT", () => this.stop());
        process.once("SIGTERM", () => this.stop());
    }
    attach(attachment) {
        if (typeof attachment !== "function") {
            Object.entries(attachment).forEach(([k, v]) => {
                if (k === "db") {
                    if (typeof v !== "object")
                        throw new Error("Overwriting app context 'db' key.");
                    this.context.db = Object.assign(Object.assign({}, this.context.db), v);
                }
                else
                    this.context[k] = v;
            });
        }
        else
            this.attachments.push(attachment);
    }
    stop() {
        log.info("Stopping server...");
        if (this.listenSocket) {
            uws.us_listen_socket_close(this.listenSocket);
            this.attachments.forEach(fn => fn(this.context));
        }
    }
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    route(pattern) {
        return route(this.core, this.context, this.middlewares)(pattern);
    }
    start(host, port) {
        return new Promise(resolve => {
            this.route("/*").any(catchAll);
            this.core.listen(host, port, (socket) => {
                if (!socket) {
                    log.error("Failed to listen to port " + port);
                    this.stop();
                }
                else {
                    this.listenSocket = socket;
                    this.attachments = this.attachments
                        .map(v => v(this.context))
                        .filter(Boolean);
                }
                return resolve(socket);
            });
        });
    }
}

exports.App = App;
exports.AppRequest = AppRequest;
exports.AppResponse = AppResponse;
exports.statusCode = statusCode;
exports.statusMessage = statusMessage;
