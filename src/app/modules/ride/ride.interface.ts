
import { Types } from "mongoose";

export type RideStatus =
  | "requested"
  | "accepted"
  | "picked_up"
  | "in_transit"
  | "completed"
  | "cancelled"
  | "rejected"
  | "waitlist";

export type RideType = "economy" | "premium" | "luxury";

export type PaymentMethod = "cash" | "card" | "wallet";

export interface Location {
  address: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface IRide {
  [x: string]: any;
  _id?: Types.ObjectId | string;
  riderId: Types.ObjectId | string;
  driverId?: Types.ObjectId | string | null;
  driverProfileId?: Types.ObjectId | string | null;
  pickupLocation: Location;
  destination: Location;
  status: RideStatus;
  rideType: RideType;
  paymentMethod: PaymentMethod;
  paymentStatus: "pending" | "completed" | "failed";
  fare: { estimated: number; actual: number | null };
  distance: { estimated: number; actual: number | null };
  duration: { estimated: number; actual: number | null };
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
  rating?: { riderRating?: number | null; driverRating?: number | null };
  feedback?: { riderComment?: string | null; driverComment?: string | null };
  createdAt?: Date;
  updatedAt?: Date;
}
// ...existing code...