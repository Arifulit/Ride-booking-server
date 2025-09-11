import Admin, { IAdmin } from "./admin.model";

export const createAdmin = async (data: Partial<IAdmin>): Promise<IAdmin> => {
  const admin = new Admin(data);
  return admin.save();
};

export const findAdminByEmail = async (
  email: string
): Promise<IAdmin | null> => {
  return Admin.findOne({ email });
};
