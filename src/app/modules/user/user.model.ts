import mongoose, { Document, Model, Schema } from "mongoose";
import PasswordUtils from "../../utils/bcrypt";

// ---------- IUser Interface ----------
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: "admin" | "rider" | "driver";
  profilePicture?: string | null;
  isBlocked?: boolean;
  lastLogin?: Date | null;
  emailVerified?: boolean;
  fullName?: string;
  getPublicProfile: () => Omit<IUser, "password">;
  checkPassword: (candidatePassword: string) => Promise<boolean>;
}

// ---------- User Schema ----------
const userSchema: Schema<IUser> = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
      // default: "DefaultFirstName"
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
      // default: "DefaultLastName"
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "rider", "driver"],
      default: "rider",
    },
    profilePicture: {
      type: String,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---------- Indexes ----------
userSchema.index({ role: 1 });
userSchema.index({ isBlocked: 1 });

// ---------- Virtual for fullName ----------
userSchema.virtual("fullName").get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// ---------- Pre-save middleware (hash password) ----------
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await PasswordUtils.hashPassword(this.password);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// ---------- Instance Methods ----------

// Password check
userSchema.methods.checkPassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return await PasswordUtils.comparePassword(candidatePassword, this.password);
};

// Public profile (exclude password)
userSchema.methods.getPublicProfile = function (this: IUser) {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// ---------- User Model ----------
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
