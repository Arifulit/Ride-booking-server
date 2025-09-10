const jwtConfig = {
  secret: process.env.JWT_SECRET || "a-string-secret-at-least-256-bits-long",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d"
};

export default jwtConfig;