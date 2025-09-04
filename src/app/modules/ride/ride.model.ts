import { Schema, model, Document, Types, Model } from "mongoose";

// Bangla: Ride model এর জন্য interface (টাইপ সেফ)
export interface IRide extends Document {
  riderId: Types.ObjectId;
  driverId?: Types.ObjectId | null;
  driverProfileId?: Types.ObjectId | null;

  pickupLocation: {
    address: string;
    coordinates: {
      type: "Point";
      coordinates: [number, number];
    };
  };

  destination: {
    address: string;
    coordinates: {
      type: "Point";
      coordinates: [number, number];
    };
  };

  status:
    | "requested"
    | "accepted"
    | "picked_up"
    | "in_transit"
    | "completed"
    | "cancelled"
    | "rejected"
    | "waitlist";

  fare: {
    estimated: number;
    actual: number | null;
  };

  distance: {
    estimated: number;
    actual: number | null;
  };

  duration: {
    estimated: number;
    actual: number | null;
  };

  rideType: "economy" | "premium" | "luxury";
  paymentMethod: "cash" | "card" | "wallet";
  paymentStatus: "pending" | "completed" | "failed";

  timeline: {
    requested: Date;
    accepted?: Date | null;
    pickedUp?: Date | null;
    inTransit?: Date | null;
    completed?: Date | null;
    cancelled?: Date | null;
  };

  cancellationReason?: string | null;
  cancelledBy?: "rider" | "driver" | "admin" | null;
  notes?: string;

  rating?: {
    riderRating?: number | null;
    driverRating?: number | null;
  };

  feedback?: {
    riderComment?: string | null;
    driverComment?: string | null;
  };

  canBeCancelled(): boolean;
  updateStatus(
    newStatus: IRide["status"],
    updatedBy?: "rider" | "driver" | "admin" | null
  ): Promise<IRide>;
}

// Ride schema
const rideSchema = new Schema<IRide>(
  {
    riderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    driverProfileId: { type: Schema.Types.ObjectId, ref: "Driver", default: null },

    pickupLocation: {
      address: { type: String, required: true, trim: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true },
      },
    },

    destination: {
      address: { type: String, required: true, trim: true },
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

    fare: {
      estimated: { type: Number, required: true, min: 0 },
      actual: { type: Number, default: null, min: 0 },
    },

    distance: {
      estimated: { type: Number, required: true, min: 0 },
      actual: { type: Number, default: null, min: 0 },
    },

    duration: {
      estimated: { type: Number, required: true, min: 0 },
      actual: { type: Number, default: null, min: 0 },
    },

    rideType: { type: String, enum: ["economy", "premium", "luxury"], default: "economy" },
    paymentMethod: { type: String, enum: ["cash", "card", "wallet"], default: "cash" },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },

    timeline: {
      requested: { type: Date, default: Date.now },
      accepted: { type: Date, default: null },
      pickedUp: { type: Date, default: null },
      inTransit: { type: Date, default: null },
      completed: { type: Date, default: null },
      cancelled: { type: Date, default: null },
    },

    cancellationReason: { type: String, default: null },
    cancelledBy: { type: String, enum: ["rider", "driver", "admin"], default: null },
    notes: { type: String, trim: true, maxlength: 500 },

    rating: {
      riderRating: { type: Number, min: 1, max: 5, default: null },
      driverRating: { type: Number, min: 1, max: 5, default: null },
    },

    feedback: {
      riderComment: { type: String, default: null, trim: true, maxlength: 500 },
      driverComment: { type: String, default: null, trim: true, maxlength: 500 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
rideSchema.index({ riderId: 1 });
rideSchema.index({ driverId: 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ createdAt: -1 });
rideSchema.index({ "pickupLocation.coordinates": "2dsphere" });
rideSchema.index({ "destination.coordinates": "2dsphere" });

// Virtuals
rideSchema.virtual("rider", {
  ref: "User",
  localField: "riderId",
  foreignField: "_id",
  justOne: true,
});

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

// Methods
rideSchema.methods.canBeCancelled = function (): boolean {
  return ["requested", "accepted"].includes(this.status);
};

rideSchema.methods.updateStatus = function (
  newStatus: IRide["status"],
  updatedBy: "rider" | "driver" | "admin" | null = null
): Promise<IRide> {
  this.status = newStatus;
  const timelineKey = newStatus === "in_transit" ? "inTransit" : newStatus;
  (this.timeline as any)[timelineKey] = new Date();

  if (newStatus === "cancelled") {
    this.cancelledBy = updatedBy;
  }

  return this.save();
};

// Statics
rideSchema.statics.calculateFare = function (
  distance: number,
  rideType: "economy" | "premium" | "luxury" = "economy"
): number {
  const baseRates = {
    economy: { base: 50, perKm: 20 },
    premium: { base: 80, perKm: 30 },
    luxury: { base: 120, perKm: 40 },
  };

  const rate = baseRates[rideType];
  return Math.round(rate.base + distance * rate.perKm);
};

export const Ride: Model<IRide> = model<IRide>("Ride", rideSchema);
export default Ride;
