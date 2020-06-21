'use strict';

var server = require('@velocity9/server');

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function throttleKey(req, key = "global") {
    return `requests/${req.remoteAddress}/${key}/${Math.trunc(Date.now() / 1000)}`;
}
const Throttle = ({ key, rate = 1000, group, store, }) => ({ res, req, session, next }) => __awaiter(void 0, void 0, void 0, function* () {
    if (group == null ||
        (session && (session.group === 0 || (session.group & group) > 0))) {
        const uniqueKey = throttleKey(req, key);
        const count = yield store.incr(uniqueKey);
        if (count === 1)
            store.expire(uniqueKey, 2);
        if (count > rate)
            return res.sendStatus(server.statusCode.TooManyRequests);
    }
    next();
});

module.exports = Throttle;
