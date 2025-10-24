import { z } from "zod";

export const updateProfileValidation = z.object({
  vehicleInfo: z
    .object({
      make: z.string().optional(),
      model: z.string().optional(),
      year: z.number().int().min(1990).optional(),
      color: z.string().optional(),
      plateNumber: z.string().optional(),
    })
    .optional(),
  documentsUploaded: z
    .object({
      license: z.boolean().optional(),
      vehicleRegistration: z.boolean().optional(),
      insurance: z.boolean().optional(),
    })
    .optional(),
});



export const updateAvailabilityValidation = z
  .object({
    available: z.boolean().optional(),
    isOnline: z.boolean().optional(),
    location: z
      .object({
        lon: z.number(),
        lat: z.number(),
      })
      .optional(),
  })
  .refine((val) => val.available !== undefined || val.isOnline !== undefined, {
    message: "available or isOnline is required",
  });

export type UpdateAvailabilityBody = z.infer<typeof updateAvailabilityValidation>;

export const updateLocationValidation = z.object({
  longitude: z.number(),
  latitude: z.number(),
});
