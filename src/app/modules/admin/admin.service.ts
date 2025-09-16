import Admin, { IAdmin } from "./admin.model";

/**
 * Create a new admin user
 */
export const createAdmin = async (data: Partial<IAdmin>): Promise<IAdmin> => {
  const admin = new Admin(data);
  return await admin.save();
};

/**
 * Find admin by email
 */
export const findAdminByEmail = async (
  email: string
): Promise<IAdmin | null> => {
  return await Admin.findOne({ email });
};