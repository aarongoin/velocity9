'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var server = require('@velocity9/server');

const AllGroups = 0xffffffff;
const Authorize = ({ group, redirect }) => ({ res, req, session, next }) => {
    if (group) {
        if (!session)
            throw new Error(`Cannot authorize request at '${req.url}' without a session to check.`);
        if (session.group === 0) {
            if (redirect)
                return res
                    .setHeader("Location", redirect)
                    .sendStatus(server.statusCode.SeeOther);
            return res.sendStatus(server.statusCode.Unauthorized);
        }
        if ((session.group & group) === 0)
            return res.sendStatus(server.statusCode.Forbidden);
    }
    next();
};

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}
function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function hash(len = 32) {
    let id = "";
    while (len--) {
        id += alphabet[(Math.random() * 62) >> 0];
    }
    return id;
}
function createSession(from, store) {
    return Object.assign(Object.assign({}, from), { update: (data) => __awaiter(this, void 0, void 0, function* () {
            const _a = this, session = __rest(_a, ["update", "destroy"]);
            const keys = Object.keys(data).filter(key => data[key] !== session[key]);
            if (keys.length) {
                for (const key of keys)
                    session[key] = data[key];
                yield store.set(`sessions/${session.id}`, JSON.stringify(session));
            }
            return Promise.resolve();
        }),
        destroy: () => store.del(`sessions/${this.id}`) });
}
function newSession(store) {
    return __awaiter(this, void 0, void 0, function* () {
        const id = hash();
        const session = {
            id,
            csrf: hash(),
            user_id: null,
            group: 0,
            started: Date.now()
        };
        yield store.set(`sessions/${id}`, JSON.stringify(session));
        return createSession(session, store);
    });
}
function getSession(id, store) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = JSON.parse(yield store.get(`sessions/${id}`));
        return session ? createSession(session, store) : null;
    });
}
const Session = ({ domain, useCsrfToken = true, idleTimeout = 1800,
maxLength = 604800,
autoRenew = true
 }) => (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { req, res, next, db } = context;
    if (process.env.NODE_ENV === "development") {
        if (!db)
            throw new Error("Cannot use session middleware without access to a session db.");
    }
    let isNewSession = false;
    if (req.cookies.session_id) {
        context.session = yield getSession(req.cookies.session_id, db.session);
        if (maxLength &&
            context.session &&
            Date.now() - context.session.started > maxLength) {
            context.session.destroy();
            context.session = null;
        }
    }
    if (!req.cookies.session_id || !context.session) {
        isNewSession = true;
        context.session = yield newSession(db.session);
    }
    if (autoRenew || isNewSession) {
        db.session.expire(`sessions/${context.session.id}`, idleTimeout);
        domain = domain || req.getHeader("host");
        res.setCookie("session_id", context.session.id, {
            domain,
            maxAge: idleTimeout,
            sameSite: "strict",
            secure: true
        });
        if (useCsrfToken)
            res.setCookie("csrf-token", context.session.csrf, {
                domain,
                maxAge: idleTimeout,
                sameSite: "strict"
            });
    }
    if (useCsrfToken &&
        !isNewSession &&
        context.session.csrf !==
            (req.getHeader("x-csrf-token") || req.params.csrf_token)) {
        return res.sendStatus(server.statusCode.Forbidden);
    }
    next();
});

exports.AllGroups = AllGroups;
exports.Authorize = Authorize;
exports.Session = Session;
