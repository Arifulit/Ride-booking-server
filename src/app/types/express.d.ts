
import { IUser } from "../modules/user/user.model";
import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: IUser;
  }
}
