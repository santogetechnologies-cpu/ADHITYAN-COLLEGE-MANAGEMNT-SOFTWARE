import { useForm, UseFormProps, FieldValues, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export function useZodForm<TFieldValues extends FieldValues = FieldValues, TContext = any>(
  schema: z.ZodType<TFieldValues, any, any>,
  options?: Omit<UseFormProps<TFieldValues, TContext>, 'resolver'>
) {
  return useForm<TFieldValues, TContext>({
    ...options,
    resolver: zodResolver(schema),
  });
}

export function getFieldError(errors: FieldErrors, name: string): string | undefined {
  const error = errors[name];
  if (!error) return undefined;
  return error.message as string | undefined;
}

export const commonSchemas = {
  nonEmptyString: (fieldName = 'Field') =>
    z.string().trim().min(1, `${fieldName} is required`),

  positiveInteger: (fieldName = 'Value', min = 1) =>
    z.coerce.number().int().min(min, `${fieldName} must be at least ${min}`),

  email: z.string().trim().email('Please enter a valid email address'),

  phone: z.string().trim().regex(/^[0-9+ -]{10,15}$/, 'Please enter a valid phone number').optional().or(z.literal('')),
};

export { z };

