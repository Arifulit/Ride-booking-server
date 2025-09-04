const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }).toLowerCase(),
  password: z.string({ required_error: 'Password is required' })
});

module.exports = loginSchema;