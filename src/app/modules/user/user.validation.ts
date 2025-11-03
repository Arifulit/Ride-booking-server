import { Request, Response, NextFunction } from "express";
export const validateUpdateProfile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowed = ["firstName", "lastName", "phone", "profilePicture"];
  const keys = Object.keys(req.body);
  const invalid = keys.filter((k) => !allowed.includes(k));
  if (invalid.length) {
    return res
      .status(400)
      .json({
        success: false,
        message: `Invalid fields: ${invalid.join(", ")}`,
      });
  }
  next();
};
