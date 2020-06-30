import {
  HttpResponse as UwsResponse,
  HttpRequest as UwsRequest,
  TemplatedApp
} from "uws";
import { AppRequest } from "./request";
import { AppResponse } from "./response";
import * as validator from "./validators";
import log from "./log";
import { statusMessage, statusCode } from "./status";
import { defer } from "./utils";
import {
  Methods,
  Route,
  Middleware,
  Handler,
  RouteContext,
  HttpResponse,
  HttpRequest,
  AppContext
} from "./index.d";

type ParamValidators = [string, validator.Validator<unknown>][];

function Parser(url: string): Middleware {
  const [pathname, params] = url.split("?");

  const url_params: ParamValidators = [];
  for (const part of pathname.split("/")) {
    if (part.startsWith("{")) {
      const [name, type = "any"] = part
        .substring(1, part.length - 1)
        .split(":");
      const validate = validator.basicValidators[type]
        ? validator.basicValidators[type](name, false)
        : validator.Custom(name, type, false);
      url_params.push([name, validate]);
    } else if (part.startsWith(":"))
      url_params.push([part.substring(1), validator.Any]);
  }

  const query_params: ParamValidators = [];
  for (const query of params.split(",")) {
    if (query.startsWith("{")) {
      const [name, type = "any"] = query
        .substring(1, query.length - 1)
        .split(":");
      const validate = validator.basicValidators[type]
        ? validator.basicValidators[type](name, true)
        : validator.Custom(name, type, true);
      query_params.push([name, validate]);
    } else query_params.push([name, validator.Any]);
  }

  return ({ req, next }) => {
    const params: Record<string, unknown> = {};
    // @ts-expect-error 2540 - req.req is only read-only to external users
    const q = new URLSearchParams(req.req.getQuery());
    for (const [name, validate] of query_params)
      params[name] = validate(q.get(name));
    for (const i in url_params) {
      const [name, validate] = url_params[i];
      // @ts-expect-error 2540 - req.req is only read-only to external users
      params[name] = validate(req.req.getParameter(+i));
    }
    // @ts-expect-error 2540 - req.params is only read-only to external users
    req.params = params;
    next();
  };
}

function routeUrl(pattern: string): [string, boolean] {
  let useParser = false;
  const [path, params] = pattern.split("?");
  const url = path
    .split("/")
    .map(part => {
      if (part.startsWith("{")) {
        useParser = true;
        return `:${part.split(":")[0].substring(1)}`;
      }
      if (part.startsWith(":")) useParser = true;
      return part;
    })
    .join("/");

  if (params) useParser = true;

  return [url, useParser];
}

type RouteHandler = (res: UwsResponse, req: UwsRequest) => Promise<void>;
type HandlerWrapper = (handler: Handler) => RouteHandler;
function applyMiddleware(
  middlewares: Middleware[],
  context: AppContext
): HandlerWrapper {
  return (handler: Handler) => {
    let done = true;
    const next = () => {
      done = false;
    };
    return async (baseRes: UwsResponse, baseReq: UwsRequest) => {
      const res = new AppResponse(baseRes);
      const req = new AppRequest(
        baseReq,
        baseRes.onData,
        baseRes.getRemoteAddress()
      );
      const payload: RouteContext<HttpResponse, HttpRequest> = {
        ...context,
        res,
        req,
        next
      };
      if (!middlewares.length) return handler(payload);
      try {
        for (const middleware of middlewares) {
          done = true;
          await middleware(payload);
          if (done) return;
        }
        handler(payload);
      } catch (err) {
        res.sendStatus(statusCode.InternalServerError);
        log.error(err);
      }
    };
  };
}

export default function route(
  app: TemplatedApp,
  context: AppContext,
  middlewares: Middleware[]
) {
  return (pattern: string) => {
    const [url, useParser] = routeUrl(pattern);
    if (useParser) middlewares.push(Parser(pattern));
    const routeMiddleware = applyMiddleware(middlewares, context);
    const used: Partial<Record<Methods | "any", boolean>> = {};
    const methods: Route = {
      use: (middleware: Middleware) => {
        middlewares.push(middleware);
        return methods;
      },
      any: (handler: Handler) => {
        used.any = true;
        app.any(url, routeMiddleware(handler));
      },
      get: (handler: Handler) => {
        if (process.env.NODE_ENV === "development") {
          if (used.get)
            throw new Error(`Duplicate 'get' method for route: ${url}`);
          used.get = true;
        }
        app.get(url, routeMiddleware(handler));
        return methods;
      },
      post: (handler: Handler) => {
        if (process.env.NODE_ENV === "development") {
          if (used.post)
            throw new Error(`Duplicate 'post' method for route: ${url}`);
          used.post = true;
        }
        app.post(url, routeMiddleware(handler));
        return methods;
      },
      put: (handler: Handler) => {
        if (process.env.NODE_ENV === "development") {
          if (used.put)
            throw new Error(`Duplicate 'put' method for route: ${url}`);
          used.put = true;
        }
        app.put(url, routeMiddleware(handler));
        return methods;
      },
      del: (handler: Handler) => {
        if (process.env.NODE_ENV === "development") {
          if (used.delete)
            throw new Error(`Duplicate 'del' method for route: ${url}`);
          used.delete = true;
        }
        app.del(url, routeMiddleware(handler));
        return methods;
      },
      head: (handler: Handler) => {
        if (process.env.NODE_ENV === "development") {
          if (used.head)
            throw new Error(`Duplicate 'head' method for route: ${url}`);
          used.head = true;
        }
        app.head(url, routeMiddleware(handler));
        return methods;
      },
      options: (handler: Handler) => {
        if (process.env.NODE_ENV === "development") {
          if (used.options)
            throw new Error(`Duplicate 'options' method for route: ${url}`);
          used.options = true;
        }
        app.options(url, routeMiddleware(handler));
        return methods;
      },
      trace: (handler: Handler) => {
        if (process.env.NODE_ENV === "development") {
          if (used.trace)
            throw new Error(`Duplicate 'trace' method for route: ${url}`);
          used.trace = true;
        }
        app.trace(url, routeMiddleware(handler));
        return methods;
      }
    };
    defer(
      () =>
        !used.any &&
        app.any(url, (res: UwsResponse) =>
          res.writeStatus(statusMessage[statusCode.MethodNotAllowed])
        )
    );
    return methods;
  };
}
