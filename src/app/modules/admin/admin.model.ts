import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdmin extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: "admin";
}

const AdminSchema: Schema<IAdmin> = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, default: "admin" },
  },
  { timestamps: true }
);

const Admin: Model<IAdmin> = mongoose.model<IAdmin>("Admin", AdminSchema);

export default Admin;
