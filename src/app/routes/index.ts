const express = require("express");
const userRoutes = require("../modules/user/user.routes");
const authRoutes = require("../modules/auth/auth.routes");
const driverRoutes = require("../modules/driver/driver.routes");
const rideRoutes = require("../modules/ride/ride.routes");
const adminRoutes = require("../modules/admin/admin.routes");

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/drivers",
    route: driverRoutes,
  },
  {
    path: "/rides",
    route: rideRoutes,
  },
  {
    path: "/admin",
    route: adminRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
