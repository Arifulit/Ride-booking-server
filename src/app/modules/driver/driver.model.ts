
import { Schema, model } from "mongoose";
import { IDriver } from "./driver.interface";
import {
  DRIVER_APPROVAL_STATUS,
  DRIVER_DEFAULT_LOCATION,
} from "./driver.constant";

const driverSchema = new Schema<IDriver>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    vehicleInfo: {
      make: { type: String, required: true },
      model: { type: String, required: true },
      year: { type: Number, required: true },
      color: { type: String, required: true },
      plateNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true,
      },
    },
    approvalStatus: {
      type: String,
      enum: DRIVER_APPROVAL_STATUS,
      default: "pending",
    },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number],
        default: DRIVER_DEFAULT_LOCATION.coordinates,
      },
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    earnings: {
      total: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
    },
    documentsUploaded: {
      license: { type: Boolean, default: false },
      vehicleRegistration: { type: Boolean, default: false },
      insurance: { type: Boolean, default: false },
    },
    approvalNotes: { type: String, default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

driverSchema.index({ currentLocation: "2dsphere" });

driverSchema.methods.canAcceptRides = function (): boolean {
  return this.approvalStatus === "approved" && this.isOnline;
};

driverSchema.methods.updateLocation = async function (
  longitude: number,
  latitude: number
) {
  this.currentLocation = { type: "Point", coordinates: [longitude, latitude] };
  return this.save();
};

export default model<IDriver>("Driver", driverSchema);
