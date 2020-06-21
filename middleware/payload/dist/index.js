'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var server = require('@velocity9/server');

function getContentLength(req) {
    const len = +req.getHeader("Content-Length");
    return Number.isNaN(len) ? 0 : len;
}
function assertContentLength(res, req) {
    const len = getContentLength(req);
    if (len === 0) {
        res.sendStatus(server.statusCode.LengthRequired);
        return false;
    }
    return true;
}
const defaultParseOptions = {
    post: true,
    patch: true,
    put: true,
};

const RequestPayloadLimit = ({ limit, }) => ({ res, req, next }) => {
    const len = getContentLength(req);
    if (len > limit)
        return res.sendStatus(server.statusCode.PayloadTooLarge);
    next();
};

const ParseText = (options = defaultParseOptions) => ({ res, req, next }) => {
    if (!options[req.method])
        return next();
    req
        .text()
        .then(next)
        .catch((err) => res.status(server.statusCode.BadRequest).send(err.message));
};
const ExpectText = (options = defaultParseOptions) => ({ res, req, next }) => {
    if (!options[req.method])
        return next();
    if (assertContentLength(res, req)) {
        const contentType = req.getHeader("Content-Type");
        if (!contentType.includes("text")) {
            return res
                .status(server.statusCode.BadRequest)
                .send(`Unexpected Content-Type '${contentType}'. Expected a text MIME type.`);
        }
        return ParseText(options)({ res, req, next });
    }
};

const ParseJson = (options = defaultParseOptions) => ({ res, req, next }) => {
    if (!options[req.method])
        return next();
    req
        .json()
        .then(next)
        .catch((err) => res.status(server.statusCode.BadRequest).send(err.message));
};
const ExpectJson = (options = defaultParseOptions) => ({ res, req, next }) => {
    if (!options[req.method])
        return next();
    if (assertContentLength(res, req)) {
        const contentType = req.getHeader("Content-Type");
        if (contentType !== "application/json") {
            return res
                .status(server.statusCode.BadGateway)
                .send(`Unexpected Content-Type '${contentType}'. Expected 'application/json'.`);
        }
        return ParseJson(options)({ res, req, next });
    }
};

const ParseArrayBuffer = (options = defaultParseOptions) => ({ res, req, next }) => {
    if (!options[req.method])
        return next();
    req
        .arrayBuffer()
        .then(next)
        .catch((err) => res.status(server.statusCode.BadRequest).send(err.message));
};
const ExpectArrayBuffer = (options = defaultParseOptions) => ({ res, req, next }) => {
    if (!options[req.method])
        return next();
    if (assertContentLength(res, req))
        return ParseArrayBuffer(options)({ res, req, next });
};

exports.ExpectArrayBuffer = ExpectArrayBuffer;
exports.ExpectJson = ExpectJson;
exports.ExpectText = ExpectText;
exports.ParseArrayBuffer = ParseArrayBuffer;
exports.ParseJson = ParseJson;
exports.ParseText = ParseText;
exports.RequestPayloadLimit = RequestPayloadLimit;
