import { Document } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string | null;
  role: "admin" | "rider" | "driver";
  profilePicture?: string | null;
  isBlocked?: boolean;
  lastLogin?: Date | null;
  emailVerified?: boolean;
  fullName?: string;
  getPublicProfile: () => Omit<IUser, "password">;
  checkPassword: (candidatePassword: string) => Promise<boolean>;
}
