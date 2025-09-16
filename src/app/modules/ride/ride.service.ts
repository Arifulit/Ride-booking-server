import Driver from "../driver/driver.model";
import { Location, RideType } from "./ride.interface";
import Ride from "./ride.model";

// Convert degrees to radians
const toRadians = (deg: number): number => deg * (Math.PI / 180);

// Haversine formula for distance (in km, 2 decimal places)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

// Estimate ride distance, duration & fare
const calculateEstimates = (
  pickup: Location,
  destination: Location,
  rideType: RideType = "economy"
) => {
  const [pickupLon, pickupLat] = pickup.coordinates.coordinates;
  const [destLon, destLat] = destination.coordinates.coordinates;

  const distance = calculateDistance(pickupLat, pickupLon, destLat, destLon);
  const duration = Math.round((distance / 30) * 60); // 30 km/h avg speed
  const fare = Ride.calculateFare(distance, rideType);

  return { distance, duration, fare };
};

// Find nearby drivers


// Find nearby drivers
const findNearbyDrivers = async (
  longitude: number,
  latitude: number,
  radius: number = 10
) => {
  try {
    // Ensure longitude/latitude are numbers
    const lng = Number(longitude);
    const lat = Number(latitude);

    // Make sure there are drivers with valid currentLocation
    return await Driver.find({
      approvalStatus: "approved",
      isOnline: true,
      currentLocation: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius * 1000, // km → meters
        },
      },
    }).populate("userId", "firstName lastName phone");
  } catch (error) {
    console.error("Error finding nearby drivers:", error);
    throw error;
  }
};

const RideService = {
  toRadians,
  calculateDistance,
  calculateEstimates,
  findNearbyDrivers,
};

export default RideService;
