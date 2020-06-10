import { Middleware } from "../types";

export const SetCookie: Middleware = ({ req }, next) => {

  const cookies = {};
  for (const cookie of req.getHeader("cookie").split("; ")) {
    const [name, value] = cookie.split("=");
    cookies[name] = value;
  }
  // @ts-ignore
  req.cookies = cookies;
  next();
}