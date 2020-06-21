import { log, Middleware } from "@velocity9/server";

const RequestLogger: Middleware = ({ res, req, next }) => {
  const start = Date.now();
  res.done.then(() => {
    // @ts-ignore
    const statusCode = res.statusCode;
    log[statusCode < 400 ? "info" : statusCode < 500 ? "warning" : "error"](
      `${req.method} ${req.url} - ${statusCode} (${Date.now() - start} ms)`
    );
  });
  next();
};

export default RequestLogger;
