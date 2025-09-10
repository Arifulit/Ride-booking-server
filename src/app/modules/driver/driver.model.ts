import { Schema, model, Document, Types } from "mongoose";

// TypeScript interface (type-safety নিশ্চিত করার জন্য)
export interface IDriver extends Document {
  userId: Types.ObjectId;
  licenseNumber: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
  };
  approvalStatus: "pending" | "approved" | "rejected" | "suspended";
  isOnline: boolean;
  currentLocation: {
    type: "Point";
    coordinates: [number, number];
  };
  rating: {
    average: number;
    count: number;
  };
  earnings: {
    total: number;
    thisMonth: number;
  };
  documentsUploaded: {
    license: boolean;
    vehicleRegistration: boolean;
    insurance: boolean;
  };
  approvalNotes?: string | null;
  joinedAt: Date;

  // Methods
  canAcceptRides(): boolean;
  updateLocation(longitude: number, latitude: number): Promise<IDriver>;
}

// Schema তৈরি
const driverSchema = new Schema<IDriver>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
      trim: true,
    },
    vehicleInfo: {
      make: { type: String, required: true, trim: true },
      model: { type: String, required: true, trim: true },
      year: {
        type: Number,
        required: true,
        min: [1990, "Vehicle must be from 1990 or later"],
        max: [new Date().getFullYear() + 1, "Invalid vehicle year"],
      },
      color: { type: String, required: true, trim: true },
      plateNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true,
      },
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], default: [0, 0] },
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    earnings: {
      total: { type: Number, default: 0, min: 0 },
      thisMonth: { type: Number, default: 0, min: 0 },
    },
    documentsUploaded: {
      license: { type: Boolean, default: false },
      vehicleRegistration: { type: Boolean, default: false },
      insurance: { type: Boolean, default: false },
    },
    approvalNotes: { type: String, default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
driverSchema.index({ approvalStatus: 1 });
driverSchema.index({ isOnline: 1 });
driverSchema.index({ currentLocation: "2dsphere" });

// Virtual field
driverSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Methods
driverSchema.methods.canAcceptRides = function (): boolean {
  return this.approvalStatus === "approved" && this.isOnline;
};

driverSchema.methods.updateLocation = async function (
  longitude: number,
  latitude: number
): Promise<IDriver> {
  this.currentLocation = { type: "Point", coordinates: [longitude, latitude] };
  return this.save();
};

// Model export
const Driver = model<IDriver>("Driver", driverSchema);
export default Driver;
