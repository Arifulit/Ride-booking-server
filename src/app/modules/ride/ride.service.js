class RideService {
  /**
   * Calculate ride estimates (distance, duration, fare)
   * @param {Object} pickup - Pickup location
   * @param {Object} destination - Destination location
   * @param {string} rideType - Type of ride
   * @returns {Object} - Estimates
   */
  static calculateEstimates(pickup, destination, rideType = 'economy') {
    // Simple distance calculation using Haversine formula
    const distance = this.calculateDistance(
      pickup.coordinates.coordinates[1], pickup.coordinates.coordinates[0],
      destination.coordinates.coordinates[1], destination.coordinates.coordinates[0]
    );

    // Estimate duration (assuming average speed of 30 km/h in city)
    const duration = Math.round((distance / 30) * 60); // in minutes

    // Calculate fare
    const fare = this.calculateFare(distance, rideType);

    return { distance, duration, fare };
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} - Distance in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} - Radians
   */
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate fare based on distance and ride type
   * @param {number} distance - Distance in kilometers
   * @param {string} rideType - Type of ride
   * @returns {number} - Fare amount
   */
  static calculateFare(distance, rideType = 'economy') {
    const baseRates = {
      economy: { base: 50, perKm: 20, minimumFare: 100 },
      premium: { base: 80, perKm: 30, minimumFare: 150 },
      luxury: { base: 120, perKm: 40, minimumFare: 200 }
    };

    const rate = baseRates[rideType] || baseRates.economy;
    const calculatedFare = rate.base + (distance * rate.perKm);
    
    return Math.max(Math.round(calculatedFare), rate.minimumFare);
  }

  /**
   * Find nearby drivers
   * @param {number} longitude - Pickup longitude
   * @param {number} latitude - Pickup latitude
   * @param {number} radius - Search radius in kilometers
   * @returns {Array} - Array of nearby drivers
   */
  static async findNearbyDrivers(longitude, latitude, radius = 10) {
    const Driver = require('../driver/driver.model');
    
    return await Driver.find({
      approvalStatus: 'approved',
      isOnline: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    }).populate('userId', 'firstName lastName phone');
  }
}

module.exports = RideService;