# 🚗 Ride Booking API

A secure, scalable, and role-based backend API for a ride booking system similar to Uber/Pathao, built with Express.js and MongoDB.

## Demo Video

[Play Video Ride Booking API](https://drive.google.com/file/d/1cRPbWJx8aw_4RI1IWcWiRZt-EaUHe4dz/preview)


## 🚀 Features

### Authentication & Authorization
- JWT-based authentication system
- Three distinct user roles: Admin, Rider, Driver
- Secure password hashing with bcrypt
- Role-based route protection

### Core Functionality
- **Riders**: Request rides, cancel rides, view ride history, rate drivers
- **Drivers**: Accept/reject rides, update ride status, manage availability, track earnings
- **Admins**: Manage users and drivers, approve driver applications, view system analytics

### Technical Features
- RESTful API design
- Comprehensive input validation
- Error handling and logging
- Rate limiting and security headers
- Geolocation support for driver matching
- Real-time ride status tracking

## 📁 Project Structure

```
src/
├── modules/
│   ├── auth/                    # Authentication module
│   │   ├── auth.controller.js   # Authentication logic
│   │   ├── auth.routes.js       # Auth endpoints
│   │   ├── auth.service.js      # Auth business logic
│   │   └── schemas/             # Validation schemas
│   ├── user/                    # User management
│   │   ├── user.model.js        # User database model
│   │   ├── user.routes.js       # User endpoints
│   │   └── user.controller.js   # User logic
│   ├── driver/                  # Driver management
│   │   ├── driver.model.js      # Driver database model
│   │   ├── driver.routes.js     # Driver endpoints
│   │   └── driver.controller.js # Driver logic
│   ├── ride/                    # Ride management
│   │   ├── ride.model.js        # Ride database model
│   │   ├── ride.routes.js       # Ride endpoints
│   │   ├── ride.controller.js   # Ride logic
│   │   └── ride.service.js      # Ride business logic
│   └── admin/                   # Admin management
│       ├── admin.routes.js      # Admin endpoints
│       └── admin.controller.js  # Admin logic
├── middlewares/                 # Custom middleware
│   ├── auth.middleware.js       # JWT authentication
│   ├── role.middleware.js       # Role-based authorization
│   ├── validation.middleware.js # Input validation
│   └── error.middleware.js      # Error handling
├── config/                      # Configuration files
│   ├── database.js              # MongoDB connection
│   └── jwt.js                   # JWT configuration
├── utils/                       # Utility functions
│   ├── bcrypt.js                # Password hashing
│   ├── jwt.js                   # JWT utilities
│   └── response.js              # Response formatting
├── app.js                       # Express app setup
└── server.js                    # Server entry point
```

## 🛠 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ride-booking-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/ride-booking-api
   JWT_SECRET=your-super-secret-jwt-key-here
   PORT=5000
   NODE_ENV=development
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
 

The API will be available at `https://assignment-ride-booking-api-1.onrender.com`

## 📋 API Documentation

### Live URL
```
https://assignment-ride-booking-api-1.onrender.com/api/v1
```

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "rider"
}

// For driver registration, add:
{
  "role": "driver",
  "licenseNumber": "DL123456789",
  "vehicleInfo": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "color": "White",
    "plateNumber": "ABC-1234"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Ride Endpoints

#### Request a Ride (Rider)
```http
POST /rides/request
Authorization:<token>
Content-Type: application/json

{
  "pickupLocation": {
    "address": "123 Main St, City",
    "coordinates": {
      "type": "Point",
      "coordinates": [-74.006, 40.7128]
    }
  },
  "destination": {
    "address": "456 Oak Ave, City",
    "coordinates": {
      "type": "Point",
      "coordinates": [-74.012, 40.7589]
    }
  },
  "rideType": "economy",
  "paymentMethod": "cash",
  "notes": "Please call when you arrive"
}
```

#### Accept a Ride (Driver)
```http
PATCH /rides/:rideId/accept
Authorization:<token>
```

#### Update Ride Status (Driver)
```http
PATCH /rides/:rideId/status
Authorization:<token>
Content-Type: application/json

{
  "status": "picked_up"
}
```

### Driver Endpoints

#### Update Availability
```http
PATCH /drivers/availability
Authorization:<token>
Content-Type: application/json

{
  "isOnline": true
}
```

#### Update Location
```http
PATCH /drivers/location
Authorization:<token>
Content-Type: application/json

{
  "longitude": -74.006,
  "latitude": 40.7128
}
```

### Admin Endpoints

#### Approve Driver
```http
PATCH /admin/drivers/:driverId/approve
Authorization:<admin-token>
Content-Type: application/json

{
  "notes": "All documents verified and approved"
}
```

#### Block User
```http
PATCH /admin/users/:userId/block
Authorization:<admin-token>
Content-Type: application/json

{
  "reason": "Violation of terms of service"
}
```

## 🎭 User Roles & Permissions

### Rider Permissions
- Request rides with pickup and destination
- Cancel rides (before driver acceptance)
- View personal ride history
- Rate completed rides
- Update personal profile

### Driver Permissions
- View and accept available ride requests
- Update ride status throughout the journey
- Manage online/offline availability
- Update current location
- View earnings and ride history
- Update vehicle and profile information

### Admin Permissions
- View all users, drivers, and rides
- Approve, reject, or suspend driver applications
- Block/unblock user accounts
- Access system analytics and reports
- Monitor platform activity

## 🔄 Ride Lifecycle

1. **Requested** - Rider creates a ride request
2. **Accepted** - Driver accepts the ride request
3. **Picked Up** - Driver arrives and picks up the rider
4. **In Transit** - Journey is in progress
5. **Completed** - Ride finished successfully
6. **Cancelled** - Ride cancelled by rider (before acceptance)

## 🔐 Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting to prevent abuse
- Security headers with Helmet.js
- Error handling without sensitive data exposure

## 🧪 Testing

The API can be tested using tools like Postman, Insomnia, or curl. A comprehensive Postman collection is recommended for testing all endpoints.

### Example Test Flow

1. **Register Admin** (manually set role to 'admin' in database)
2. **Register Rider** and **Driver**
3. **Login** as each role
4. **Driver**: Update profile and go online
5. **Admin**: Approve driver application
6. **Rider**: Request a ride
7. **Driver**: Accept ride and update status
8. **Admin**: Monitor system activity

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**
   - Use strong JWT secrets
   - Configure production MongoDB URI
   - Set NODE_ENV=production

2. **Security**
   - Enable HTTPS
   - Configure proper CORS settings
   - Use secure session management
   - Implement proper logging

3. **Performance**
   - Add database indexes
   - Implement caching where appropriate
   - Use connection pooling
   - Monitor API performance

## 📊 System Analytics

The admin dashboard provides insights into:
- Total users, riders, and drivers
- Ride statistics and trends
- Revenue and earnings reports
- System health monitoring
- Driver approval pipeline

## 🛡 Error Handling

The API implements comprehensive error handling:
- Validation errors with field-specific messages
- Authentication and authorization errors
- Database operation errors
- Rate limiting responses
- Global error catching and logging

## 📈 Scalability Features

- Modular architecture for easy feature additions
- Database indexing for performance
- Geospatial queries for driver matching
- Paginated responses for large datasets
- Efficient database queries and aggregations

## 💡 Future Enhancements

- Real-time updates with WebSocket
- Push notifications for ride updates
- Advanced driver matching algorithms
- Fare surge pricing during peak hours
- Multi-language support
- Integration with payment gateways
- Advanced analytics and reporting

## 📞 Support

For technical support or questions about the API implementation, please refer to the codebase documentation or create an issue in the repository.

---

**Built with ❤️ using Node.js, Express.js, and MongoDB**