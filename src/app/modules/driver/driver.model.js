const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true
  },
  vehicleInfo: {
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true
    },
    year: {
      type: Number,
      required: [true, 'Vehicle year is required'],
      min: [1990, 'Vehicle must be from 1990 or later'],
      max: [new Date().getFullYear() + 1, 'Invalid vehicle year']
    },
    color: {
      type: String,
      required: [true, 'Vehicle color is required'],
      trim: true
    },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      unique: true,
      trim: true,
      uppercase: true
    }
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  earnings: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    thisMonth: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  documentsUploaded: {
    license: { type: Boolean, default: false },
    vehicleRegistration: { type: Boolean, default: false },
    insurance: { type: Boolean, default: false }
  },
  approvalNotes: {
    type: String,
    default: null
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
driverSchema.index({ userId: 1 });
driverSchema.index({ approvalStatus: 1 });
driverSchema.index({ isOnline: 1 });
driverSchema.index({ currentLocation: '2dsphere' });
driverSchema.index({ 'vehicleInfo.plateNumber': 1 });

// Virtual to populate user info
driverSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Method to check if driver can accept rides
driverSchema.methods.canAcceptRides = function() {
  return this.approvalStatus === 'approved' && this.isOnline;
};

// Method to update location
driverSchema.methods.updateLocation = function(longitude, latitude) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  return this.save();
};

module.exports = mongoose.model('Driver', driverSchema);