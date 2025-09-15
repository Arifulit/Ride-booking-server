
import mongoose, { Schema, Model } from "mongoose";
import PasswordUtils from "../../utils/bcrypt";
import { IUser } from "./user.interface";

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, default: null, trim: true },
    role: {
      type: String,
      enum: ["admin", "rider", "driver"],
      default: "rider",
    },
    profilePicture: { type: String, default: null },
    isBlocked: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    emailVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ role: 1 });
userSchema.index({ isBlocked: 1 });

userSchema.virtual("fullName").get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await PasswordUtils.hashPassword(this.password);
    next();
  } catch (err) {
    next(err as Error);
  }
});

userSchema.methods.checkPassword = async function (
  this: IUser,
  candidatePassword: string
) {
  return await PasswordUtils.comparePassword(candidatePassword, this.password);
};

userSchema.methods.getPublicProfile = function (this: IUser) {
  const obj = this.toObject();
  delete (obj as any).password;
  return obj as Omit<IUser, "password">;
};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
