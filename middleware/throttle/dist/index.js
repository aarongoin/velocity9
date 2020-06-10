var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
System.register("index", ["@velocity9/server"], function (exports_1, context_1) {
    "use strict";
    var server_1, defaultOptions, Throttle;
    var __moduleName = context_1 && context_1.id;
    function throttleKey(req, key = "global") {
        return `requests/${req.remoteAddress}/${key}/${Math.trunc(Date.now() / 1000)}`;
    }
    return {
        setters: [
            function (server_1_1) {
                server_1 = server_1_1;
            }
        ],
        execute: function () {
            defaultOptions = {
                rate: 1000
            };
            Throttle = ({ key, rate, group, } = defaultOptions) => ({ res, req, store }, next) => __awaiter(void 0, void 0, void 0, function* () {
                if (group == null ||
                    (req.session.group & group) > 0 ||
                    req.session.group === 0) {
                    const uniqueKey = throttleKey(req, key);
                    const count = yield store.session.incr(uniqueKey);
                    if (count === 1)
                        store.session.expire(uniqueKey, 2);
                    if (count > rate)
                        return res.sendStatus(server_1.status.TooManyRequests);
                }
                next();
            });
            exports_1("default", Throttle);
        }
    };
});
