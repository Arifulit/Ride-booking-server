/* eslint-disable no-unused-vars */
import { Schema, model, Types, Model, Document } from "mongoose";
import { IRide, RideStatus, RideType } from "./ride.interface";

export interface IRideDocument extends IRide, Document {
  canBeCancelled(): boolean;
  updateStatus(
    newStatus: RideStatus,
    updatedBy?: "rider" | "driver" | "admin" | null
  ): Promise<IRideDocument>;
}

export interface IRideModel extends Model<IRideDocument> {
  calculateFare(distance: number, rideType?: RideType): number;
}


const rideSchema = new Schema<IRideDocument>(
  {
    riderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    driverProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    pickupLocation: {
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true },
      },
    },
    destination: {
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true },
      },
    },
    status: {
      type: String,
      enum: [
        "requested",
        "accepted",
        "picked_up",
        "in_transit",
        "completed",
        "cancelled",
        "rejected",
        "waitlist",
      ],
      default: "requested",
    },
    rideType: {
      type: String,
      enum: ["economy", "premium", "luxury"],
      default: "economy",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "wallet"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    fare: {
      estimated: { type: Number, required: true },
      actual: { type: Number, default: null },
    },
    distance: {
      estimated: { type: Number, required: true },
      actual: { type: Number, default: null },
    },
    duration: {
      estimated: { type: Number, required: true },
      actual: { type: Number, default: null },
    },
    timeline: {
      requested: { type: Date, default: Date.now },
      accepted: { type: Date, default: null },
      pickedUp: { type: Date, default: null },
      inTransit: { type: Date, default: null },
      completed: { type: Date, default: null },
      cancelled: { type: Date, default: null },
    },
    cancellationReason: { type: String, default: null },
    cancelledBy: {
      type: String,
      enum: ["rider", "driver", "admin"],
      default: null,
    },
    notes: { type: String, trim: true, maxlength: 500 },
    rating: {
      riderRating: { type: Number, min: 1, max: 5, default: null },
      driverRating: { type: Number, min: 1, max: 5, default: null },
    },
    feedback: {
      riderComment: { type: String, trim: true, maxlength: 500, default: null },
      driverComment: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

rideSchema.index({ riderId: 1 });
rideSchema.index({ driverId: 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ "pickupLocation.coordinates": "2dsphere" });
rideSchema.index({ "destination.coordinates": "2dsphere" });

// Methods
rideSchema.methods.canBeCancelled = function () {
  return ["requested", "accepted"].includes(this.status);
};

rideSchema.methods.updateStatus = function (
  newStatus: RideStatus,
  updatedBy: "rider" | "driver" | "admin" | null = null
) {
  this.status = newStatus;
  if (newStatus === "cancelled") this.cancelledBy = updatedBy;
  const timelineKey = newStatus === "in_transit" ? "inTransit" : newStatus;
  (this.timeline as any)[timelineKey] = new Date();
  return this.save();
};

// Statics
rideSchema.statics.calculateFare = function (
  distance: number,
  rideType: RideType = "economy"
) {
  const rates: Record<RideType, { base: number; perKm: number }> = {
    economy: { base: 50, perKm: 20 },
    premium: { base: 80, perKm: 30 },
    luxury: { base: 120, perKm: 40 },
  };
  const rate = rates[rideType];
  return Math.round(rate.base + distance * rate.perKm);
};
// --- Add virtuals for populate ---
rideSchema.virtual("driver", {
  ref: "User",
  localField: "driverId",
  foreignField: "_id",
  justOne: true,
});

rideSchema.virtual("driverProfile", {
  ref: "Driver",
  localField: "driverProfileId",
  foreignField: "_id",
  justOne: true,
});

export const Ride = model<IRideDocument, IRideModel>("Ride", rideSchema);
export default Ride;
