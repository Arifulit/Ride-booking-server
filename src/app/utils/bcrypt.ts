import bcrypt from "bcryptjs";


 // Hash a password

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 */
const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};


const PasswordUtils = {
  hashPassword,
  comparePassword,
};

export default PasswordUtils;