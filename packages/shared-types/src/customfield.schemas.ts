import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const CreateCustomFieldSchema = z
  .object({
    propertyType: objectIdSchema,
    name: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/, 'Name must be lowercase alphanumeric with underscores'),
    label: z.string().min(1).max(100).trim(),
    labelAm: z.string().min(1).max(100).trim(),
    dataType: z.enum([
      'text',
      'number',
      'date',
      'boolean',
      'single_select',
      'multi_select',
      'attachment',
    ]),
    isRequired: z.boolean().default(false),
    isUnique: z.boolean().default(false),
    isSearchable: z.boolean().default(false),
    options: z.array(z.string().min(1).trim()).optional(),
    validationRule: z.string().max(255).optional(),
    order: z.number().int().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.dataType === 'single_select' || data.dataType === 'multi_select') {
        return Array.isArray(data.options) && data.options.length > 0;
      }
      return true;
    },
    {
      message: 'Options are required for select data types',
      path: ['options'],
    },
  );

export const UpdateCustomFieldSchema = z.object({
  label: z.string().min(1).max(100).trim().optional(),
  labelAm: z.string().min(1).max(100).trim().optional(),
  isRequired: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
  options: z.array(z.string().min(1).trim()).optional(),
  validationRule: z.string().max(255).optional(),
  order: z.number().int().min(0).optional(),
});
