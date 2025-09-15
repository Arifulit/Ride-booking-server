import Driver from "../driver/driver.model";
import { Location, RideType } from "./ride.interface";
import Ride from "./ride.model";

// Utility functions as part of a service object
const toRadians = (deg: number): number => {
  return deg * (Math.PI / 180);
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

const calculateEstimates = (
  pickup: Location,
  destination: Location,
  rideType: RideType = "economy"
) => {
  const distance = calculateDistance(
    pickup.coordinates.coordinates[1],
    pickup.coordinates.coordinates[0],
    destination.coordinates.coordinates[1],
    destination.coordinates.coordinates[0]
  );
  const duration = Math.round((distance / 30) * 60);
  const fare = Ride.calculateFare(distance, rideType);
  return { distance, duration, fare };
};

const findNearbyDrivers = async (
  longitude: number,
  latitude: number,
  radius: number = 10
) => {
  return await Driver.find({
    approvalStatus: "approved",
    isOnline: true,
    currentLocation: {
      $near: {
        $geometry: { type: "Point", coordinates: [longitude, latitude] },
        $maxDistance: radius * 1000,
      },
    },
  }).populate("userId", "firstName lastName phone");
};

const RideService = {
  calculateDistance,
  toRadians,
  calculateEstimates,
  findNearbyDrivers,
};

export default RideService;