import { status, MiddlewareCreator } from "@velocity9/server";

// authorize all registered user groups--but not anonymous or unverified users
export const AllGroups = 0xFFFFFFFF;

export interface AuthorizeOptions {
  group: number;
  redirect?: string;
}

export const Authorize: MiddlewareCreator<AuthorizeOptions> = ({
  group,
  redirect,
}: AuthorizeOptions) => ({ res, req, next }) => {
  if (group) {
    // @ts-ignore
    if (process.env.NODE_ENV === "development") {
      if (!req.session)
        throw new Error(
          `Cannot authorize request at '${req.url}' without a session to check.`
        );
    }
    // is this a registered user? if not then they're unauthorized
    if (req.session.group === 0) {
      if (redirect) return res.setHeader("Location", redirect).sendStatus(status.SeeOther);
      return res.sendStatus(status.Unauthorized);
    }
    // is user in authorized group? if not then they're forbidden to access this route
    if ((req.session.group & group) === 0) return res.sendStatus(status.Forbidden);
  }
  next();
};
