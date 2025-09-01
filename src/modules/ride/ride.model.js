const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  driverProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  pickupLocation: {
    address: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },
  destination: {
    address: {
      type: String,
      required: [true, 'Destination address is required'],
      trim: true
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'picked_up', 'in_transit', 'completed', 'cancelled'],
    default: 'requested'
  },
  fare: {
    estimated: {
      type: Number,
      required: true,
      min: 0
    },
    actual: {
      type: Number,
      default: null,
      min: 0
    }
  },
  distance: {
    estimated: {
      type: Number, // in kilometers
      required: true,
      min: 0
    },
    actual: {
      type: Number, // in kilometers
      default: null,
      min: 0
    }
  },
  duration: {
    estimated: {
      type: Number, // in minutes
      required: true,
      min: 0
    },
    actual: {
      type: Number, // in minutes
      default: null,
      min: 0
    }
  },
  rideType: {
    type: String,
    enum: ['economy', 'premium', 'luxury'],
    default: 'economy'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  timeline: {
    requested: { type: Date, default: Date.now },
    accepted: { type: Date, default: null },
    pickedUp: { type: Date, default: null },
    inTransit: { type: Date, default: null },
    completed: { type: Date, default: null },
    cancelled: { type: Date, default: null }
  },
  cancellationReason: {
    type: String,
    default: null
  },
  cancelledBy: {
    type: String,
    enum: ['rider', 'driver', 'admin'],
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  rating: {
    riderRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    driverRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
rideSchema.index({ riderId: 1 });
rideSchema.index({ driverId: 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ createdAt: -1 });
rideSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
rideSchema.index({ 'destination.coordinates': '2dsphere' });

// Virtual to populate rider info
rideSchema.virtual('rider', {
  ref: 'User',
  localField: 'riderId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate driver info
rideSchema.virtual('driver', {
  ref: 'User',
  localField: 'driverId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate driver profile
rideSchema.virtual('driverProfile', {
  ref: 'Driver',
  localField: 'driverProfileId',
  foreignField: '_id',
  justOne: true
});

// Method to check if ride can be cancelled
rideSchema.methods.canBeCancelled = function() {
  return ['requested', 'accepted'].includes(this.status);
};

// Method to update ride status with timeline
rideSchema.methods.updateStatus = function(newStatus, updatedBy = null) {
  this.status = newStatus;
  this.timeline[newStatus === 'in_transit' ? 'inTransit' : newStatus] = new Date();
  
  if (newStatus === 'cancelled') {
    this.cancelledBy = updatedBy;
  }
  
  return this.save();
};

// Method to calculate fare (basic implementation)
rideSchema.statics.calculateFare = function(distance, rideType = 'economy') {
  const baseRates = {
    economy: { base: 50, perKm: 20 },
    premium: { base: 80, perKm: 30 },
    luxury: { base: 120, perKm: 40 }
  };
  
  const rate = baseRates[rideType];
  return Math.round(rate.base + (distance * rate.perKm));
};

module.exports = mongoose.model('Ride', rideSchema);