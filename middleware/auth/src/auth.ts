import { statusCode, MiddlewareCreator } from "@velocity9/server";
import { AuthorizeOptions, SessionContext } from "./index.d";

// authorize all registered user groups--but not anonymous or unverified users
export const AllGroups = 0xffffffff;

export const Authorize: MiddlewareCreator<AuthorizeOptions> = ({
  group,
  redirect
}) => ({ res, req, session, next }: SessionContext) => {
  if (group) {
    if (!session)
      throw new Error(
        `Cannot authorize request at '${req.url}' without a session to check.`
      );
    // is this a registered user? if not then they're unauthorized
    if (session.group === 0) {
      if (redirect)
        return res
          .setHeader("Location", redirect)
          .sendStatus(statusCode.SeeOther);
      return res.sendStatus(statusCode.Unauthorized);
    }
    // is user in authorized group? if not then they're forbidden to access this route
    if ((session.group & group) === 0)
      return res.sendStatus(statusCode.Forbidden);
  }
  next();
};
