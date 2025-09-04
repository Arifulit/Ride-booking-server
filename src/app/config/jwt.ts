const jwtConfig = {
  secret: process.env.JWT_SECRET || "your_jwt_secret",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d"
};

export default jwtConfig;