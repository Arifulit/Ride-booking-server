import jwt, { SignOptions } from "jsonwebtoken";

interface IUserPayload {
  _id?: string | number;
  id?: string | number;
  email?: string;
  role?: string;
}

interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}


const generateToken = (
  payload: Record<string, any>,
  secret: string,
  expiresIn?: string | number
): string => {
  const options: SignOptions = {};
  if (expiresIn) options.expiresIn = expiresIn as any;
  return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string, secret: string): Record<string, any> => {
  try {
    return jwt.verify(token, secret) as Record<string, any>;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};


const verifyAccessToken = (token: string): Record<string, any> => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not defined in .env");
  return verifyToken(token, secret);
};

const verifyRefreshToken = (token: string): Record<string, any> => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined in .env");
  return verifyToken(token, secret);
};


const generateTokenPair = (user: IUserPayload): ITokenPair => {
  const id = user._id ?? user.id;
  const payload = { id, email: user.email, role: user.role };

  const accessSecret = process.env.JWT_ACCESS_SECRET as string;
  const refreshSecret = process.env.JWT_REFRESH_SECRET as string;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets are not defined in .env");
  }

  const accessToken = generateToken(
    payload,
    accessSecret,
    process.env.JWT_ACCESS_EXPIRES || "1d"
  );

  const refreshToken = generateToken(
    payload,
    refreshSecret,
    process.env.JWT_REFRESH_EXPIRES || "30d"
  );

  let expiresIn = 86400; // default 1 day
  const accessExpiry = process.env.JWT_ACCESS_EXPIRES || "1d";

  if (/^\d+$/.test(accessExpiry)) {
    expiresIn = parseInt(accessExpiry, 10);
  } else if (accessExpiry.endsWith("d")) {
    expiresIn = parseInt(accessExpiry, 10) * 86400;
  } else if (accessExpiry.endsWith("h")) {
    expiresIn = parseInt(accessExpiry, 10) * 3600;
  } else if (accessExpiry.endsWith("m")) {
    expiresIn = parseInt(accessExpiry, 10) * 60;
  }

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
};

const JWTUtils = {
  generateToken,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
};

export default JWTUtils;