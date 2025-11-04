/* eslint-disable no-unused-vars */
// driver.interface.ts
import { Document, Types } from "mongoose";

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

  canAcceptRides(): boolean;
  updateLocation(longitude: number, latitude: number): Promise<IDriver>;
}
