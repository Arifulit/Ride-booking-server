import Driver from "../driver/driver.model";

interface Coordinates {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

interface Location {
  address?: string;
  coordinates: Coordinates;
}

interface EstimateResult {
  distance: number;
  duration: number;
  fare: number;
}

type RideType = "economy" | "premium" | "luxury";

export default class RideService {
  /**
   * Calculate ride estimates (distance, duration, fare)
   */
  static calculateEstimates(
    pickup: Location,
    destination: Location,
    rideType: RideType = "economy"
  ): EstimateResult {
    const distance = this.calculateDistance(
      pickup.coordinates.coordinates[1], // latitude
      pickup.coordinates.coordinates[0], // longitude
      destination.coordinates.coordinates[1],
      destination.coordinates.coordinates[0]
    );

    // Estimate duration (average speed: 30 km/h)
    const duration = Math.round((distance / 30) * 60);

    const fare = this.calculateFare(distance, rideType);

    return { distance, duration, fare };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius (km)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100;
  }

  /**
   * Convert degrees to radians
   */
  static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate fare based on distance and ride type
   */
  static calculateFare(distance: number, rideType: RideType = "economy"): number {
    const baseRates: Record<RideType, { base: number; perKm: number; minimumFare: number }> = {
      economy: { base: 50, perKm: 20, minimumFare: 100 },
      premium: { base: 80, perKm: 30, minimumFare: 150 },
      luxury: { base: 120, perKm: 40, minimumFare: 200 },
    };

    const rate = baseRates[rideType] || baseRates.economy;
    const calculatedFare = rate.base + distance * rate.perKm;

    return Math.max(Math.round(calculatedFare), rate.minimumFare);
  }

  /**
   * Find nearby drivers
   */
  static async findNearbyDrivers(
    longitude: number,
    latitude: number,
    radius: number = 10
  ) {
    return await Driver.find({
      approvalStatus: "approved",
      isOnline: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius * 1000, // km → meters
        },
      },
    }).populate("userId", "firstName lastName phone");
  }
}
