import console from "console";
import { Log } from "./index.d";

type Level = "info" | "warning" | "error" | "critical";

function write(level: Level, message: string): void {
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

const log: Log = {
  info: (message: string) => {
    setTimeout(write, 0, "info", message);
  },
  warning: (message: string) => {
    setTimeout(write, 0, "warning", message);
  },
  error: (message: string) => {
    setTimeout(write, 0, "error", message);
  },
  critical: (message: string) => {
    setTimeout(write, 0, "critical", message);
  },
};
export default log;
