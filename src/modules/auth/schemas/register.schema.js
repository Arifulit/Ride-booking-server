const { z } = require('zod');

const currentYear = new Date().getFullYear();

const vehicleInfoSchema = z.object({
  make: z.string({ required_error: 'Vehicle make is required' }),
  model: z.string({ required_error: 'Vehicle model is required' }),
  year: z.number().min(1990, { message: 'Vehicle must be from 1990 or later' })
    .max(currentYear + 1, { message: 'Invalid vehicle year' }),
  color: z.string({ required_error: 'Vehicle color is required' }),
  plateNumber: z.string({ required_error: 'Plate number is required' })
});

const registerSchema = z.object({
  firstName: z.string().trim().min(2, { message: 'First name must be at least 2 characters' })
    .max(50, { message: 'First name cannot exceed 50 characters' }),
  lastName: z.string().trim().min(2, { message: 'Last name must be at least 2 characters' })
    .max(50, { message: 'Last name cannot exceed 50 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }).toLowerCase(),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' })
    .max(128, { message: 'Password cannot exceed 128 characters' }),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, { message: 'Please enter a valid phone number' }),
  role: z.enum(['rider', 'driver', 'admin'], { message: 'Role must be either rider, driver or admin' }).default('rider'),
  licenseNumber: z.string().optional(),
  vehicleInfo: vehicleInfoSchema.optional()
}).superRefine((data, ctx) => {
  if (data.role === 'driver') {
    if (!data.licenseNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'License number is required for drivers',
        path: ['licenseNumber']
      });
    }
    if (!data.vehicleInfo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vehicle info is required for drivers',
        path: ['vehicleInfo']
      });
    }
  }
  if (data.role !== 'driver') {
    if (data.licenseNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'License number is only allowed for drivers',
        path: ['licenseNumber']
      });
    }
    if (data.vehicleInfo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vehicle info is only allowed for drivers',
        path: ['vehicleInfo']
      });
    }
  }
});

module.exports = registerSchema;