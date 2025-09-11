export interface GetAllUsersQuery {
  page?: string;
  limit?: string;
  role?: "admin" | "rider" | "driver";
  search?: string;
}

export interface GetAllDriversQuery {
  page?: string;
  limit?: string;
  status?: "pending" | "approved" | "rejected" | "suspended";
  search?: string;
}

export interface GetAllRidesQuery {
  page?: string;
  limit?: string;
  status?: string;
  riderId?: string;
  driverId?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface StatsQuery {
  period?: "today" | "week" | "month";
}

export interface BlockUserBody {
  reason?: string;
}

export interface ApprovalBody {
  notes?: string;
}

export interface RejectSuspendBody {
  reason?: string;
}

export interface AdminRegisterBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalUsers?: number;
  totalDrivers?: number;
  totalRides?: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SystemOverview {
  totalUsers: number;
  totalRiders: number;
  totalDrivers: number;
  totalRides: number;
  activeRides: number;
  onlineDrivers: number;
  pendingDriverApprovals: number;
}

export interface EarningsData {
  totalRevenue: number;
  totalRides: number;
  averageFare: number;
  totalDistance: number;
}
