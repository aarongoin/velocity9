import log from "../log";
import { Middleware } from "../types";

const RouteLogger: Middleware = ({ res, req }, next) => {
  const start = Date.now();
  res.done.then(() =>
    log[
      res.statusCode < 400 ? "info" : res.statusCode < 500 ? "warning" : "error"
    ](`${req.method} ${req.url} - ${res.statusCode} (${Date.now() - start} ms)`)
  );
  next();
};

export default RouteLogger;
