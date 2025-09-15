import { Router } from "express";
import UserRoutes from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { DriverRoutes } from "../modules/driver/driver.routes";
import { RideRoutes } from "../modules/ride/ride.routes";
import { AdminRoutes } from "../modules/admin/admin.routes";

export const router: Router = Router();

interface ModuleRoute {
  path: string;
  route: Router;
}
const moduleRoutes: ModuleRoute[] = [
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/drivers",
    route: DriverRoutes,
  },
  {
    path: "/rides",
    route: RideRoutes,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
];

moduleRoutes.forEach((route: ModuleRoute) => {
  router.use(route.path, route.route);
});

export default router;
