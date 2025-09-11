import { body, param } from "express-validator";

export const validateAdminRegister = [
  body("firstName").isString().notEmpty(),
  body("lastName").isString().notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  body("phone").optional().isString(),
];

export const validateUserIdParam = [param("userId").isMongoId()];

export const validateDriverIdParam = [param("driverId").isMongoId()];
