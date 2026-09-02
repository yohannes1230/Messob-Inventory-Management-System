import { z } from 'zod';

export const CreateSupplierSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  contact: z.object({
    person: z.string().max(100).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().max(300).optional(),
  }),
  taxId: z.string().max(50).trim().optional(),
  category: z.string().max(100).trim().optional(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();
