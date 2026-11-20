export interface AppErrorDetails {
  code?: string;
  status?: number;
  message: string;
  originalError?: any;
}

export class AppError extends Error {
  code?: string;
  status?: number;
  originalError?: any;

  constructor(details: AppErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.status = details.status;
    this.originalError = details.originalError;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function handleSupabaseError(error: any, fallbackMessage: string = 'An unexpected error occurred'): AppError {
  if (!error) {
    return new AppError({ message: fallbackMessage });
  }

  if (error instanceof AppError) {
    return error;
  }

  const code = error.code || error.status?.toString();
  const rawMessage = error.message || error.error_description || fallbackMessage;
  let friendlyMessage = rawMessage;

  // Specific Postgres & Supabase error code mapping
  switch (code) {
    case '23505': // unique_violation
      friendlyMessage = 'A record with this name or unique identifier already exists.';
      break;
    case '23503': // foreign_key_violation
      friendlyMessage = 'Cannot modify or delete this record because other items reference it.';
      break;
    case '42501': // insufficient_privilege / RLS violation
      friendlyMessage = 'Permission denied: Your institutional account does not have rights to perform this operation.';
      break;
    case 'PGRST116': // row count mismatch / not found
      friendlyMessage = 'The requested record was not found.';
      break;
    case '401':
    case 'PGRST301':
      friendlyMessage = 'Your authenticated session has expired. Please sign in again.';
      break;
    default:
      if (rawMessage.toLowerCase().includes('row-level security')) {
        friendlyMessage = 'Action blocked by Row Level Security policy: You lack administrative privileges.';
      }
      break;
  }

  return new AppError({
    code,
    status: error.status,
    message: friendlyMessage,
    originalError: error,
  });
}

