import { z } from "zod";

// Define the login schema with Zod
const loginSchema = z.object({
  email: z
    .string()
  .nonempty({ message: "Email is required" })
  .email({ message: "Please enter a valid email address" })
    .toLowerCase(),
  password: z
    .string()
    .nonempty({ message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(100, { message: "Password must be at most 100 characters long" })
});

// Infer TypeScript type from the schema
export type LoginInput = z.infer<typeof loginSchema>;

// Export the schema as default
export default loginSchema;

// Named export for convenience
export { loginSchema };
// Bangla: Login input validation er jonno Zod schema
// Bangla: Zod schema theke TypeScript type generate kora hocche
// Bangla: loginSchema ke default export kora hocche