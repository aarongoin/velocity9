import * as uws from "uws";
import route from "./route";
import { statusCode } from "./status";
import log from "./log";
import {
  AppInterface,
  AppOptions,
  AppContext,
  Context,
  Attachment,
  Route,
  RouteContext,
  Middleware
} from "./index.d";

function catchAll({ res, req }: RouteContext) {
  switch (req.method) {
    case "get":
    case "put":
    case "post":
    case "patch":
    case "delete":
    case "options":
    case "trace":
    case "head":
      return res.sendStatus(statusCode.NotFound);
    default:
      return res.sendStatus(statusCode.NotImplemented);
  }
}

export class App implements AppInterface {
  private core: uws.TemplatedApp;
  private listenSocket: uws.us_listen_socket | null = null;
  private context: AppContext = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private attachments: Array<Attachment<any, any>> = [];
  private middlewares: Array<Middleware> = [];

  constructor({ ssl }: Partial<AppOptions> = {}) {
    this.core = ssl ? uws.SSLApp(ssl) : uws.App();
    process.once("SIGINT", () => this.stop());
    process.once("SIGTERM", () => this.stop());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attach(attachment: Context | Attachment<any, any>): void {
    if (typeof attachment !== "function") {
      Object.entries(attachment).forEach(([k, v]) => {
        if (k === "db") {
          if (typeof v !== "object")
            throw new Error("Overwriting app context 'db' key.");
          this.context.db = { ...this.context.db, ...v };
        } else this.context[k] = v;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else this.attachments.push(attachment as Attachment<any, any>);
  }

  stop(): void {
    log.info("Stopping server...");
    if (this.listenSocket) {
      uws.us_listen_socket_close(this.listenSocket);
      this.attachments.forEach(fn => fn(this.context));
    }
  }

  use(middleware: Middleware): App {
    this.middlewares.push(middleware);
    return this;
  }

  route(pattern: string): Route {
    return route(this.core, this.context, this.middlewares)(pattern);
  }

  start(host: string, port: number): Promise<uws.us_listen_socket> {
    return new Promise((resolve, reject) => {
      this.route("/*").any(catchAll);
      this.core.listen(host, port, (socket: uws.us_listen_socket) => {
        if (!socket) {
          log.error(`Failed to listen to port ${port}`);
          this.stop();
        } else {
          this.listenSocket = socket;
          Promise.all(this.attachments.map(v => v(this.context)))
            .then(res => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              this.attachments = res.filter(Boolean) as Attachment<any, any>[];
              resolve(socket);
            })
            .catch((err: Error) => {
              log.error(`Error adding an attachment to app: ${err.message}`);
              this.stop();
              reject(err);
            });
        }
      });
    });
  }
}
