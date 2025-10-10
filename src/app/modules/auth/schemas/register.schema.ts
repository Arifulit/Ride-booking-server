import { z } from "zod";

// Get current year for validation
const currentYear: number = new Date().getFullYear();

// Vehicle information schema
const vehicleInfoSchema = z.object({
  make: z.string().nonempty({ message: "Vehicle make is required" }),
  model: z.string().nonempty({ message: "Vehicle model is required" }),
  year: z
    .number()
    .min(1990, { message: "Vehicle must be from 1990 or later" })
    .max(currentYear + 1, { message: "Invalid vehicle year" }),
  color: z.string().nonempty({ message: "Vehicle color is required" }),
  plateNumber: z.string().nonempty({ message: "Plate number is required" }),
});

// User roles enum for better type safety
const UserRole = z.enum(["rider", "driver", "admin"]);

// Main registration schema
const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, { message: "First name must be at least 2 characters" })
      .max(50, { message: "First name cannot exceed 50 characters" }),
    lastName: z
      .string()
      .trim()
      .min(2, { message: "Last name must be at least 2 characters" })
      .max(50, { message: "Last name cannot exceed 50 characters" }),
    email: z
      .string()
      .email({ message: "Please enter a valid email address" })
      .toLowerCase(),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" })
      .max(128, { message: "Password cannot exceed 128 characters" }),
    phone: z.string().regex(/^[\+]?[0-9]{10,16}$/, {
      message: "Please enter a valid phone number",
    }),
    role: UserRole.default("rider"),
    licenseNumber: z.string().optional(),
    vehicleInfo: vehicleInfoSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // Driver-specific validations
    if (data.role === "driver") {
      if (!data.licenseNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "License number is required for drivers",
          path: ["licenseNumber"],
        });
      }
      if (!data.vehicleInfo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vehicle info is required for drivers",
          path: ["vehicleInfo"],
        });
      }
    }

    // Non-driver validations
    if (data.role !== "driver") {
      if (data.licenseNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "License number is only allowed for drivers",
          path: ["licenseNumber"],
        });
      }
      if (data.vehicleInfo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vehicle info is only allowed for drivers",
          path: ["vehicleInfo"],
        });
      }
    }
  });

// Infer TypeScript types from schemas
export type VehicleInfo = z.infer<typeof vehicleInfoSchema>;
export type UserRoleType = z.infer<typeof UserRole>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Export schemas
export { vehicleInfoSchema, UserRole };
export default registerSchema;
