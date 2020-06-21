'use strict';

var server = require('@velocity9/server');

const RequestLogger = ({ res, req, next }) => {
    const start = Date.now();
    res.done.then(() => {
        const statusCode = res.statusCode;
        server.log[statusCode < 400 ? "info" : statusCode < 500 ? "warning" : "error"](`${req.method} ${req.url} - ${statusCode} (${Date.now() - start} ms)`);
    });
    next();
};

module.exports = RequestLogger;
