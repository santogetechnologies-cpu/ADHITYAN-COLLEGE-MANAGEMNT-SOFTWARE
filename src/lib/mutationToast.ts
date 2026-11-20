import { toast } from '@/hooks/use-toast';
import { AppError } from '@/services/api/errors';

export interface MutationToastOptions<TData = any, TVariables = any> {
  successTitle?: string;
  successDescription?: string | ((data: TData, variables: TVariables) => string);
  errorTitle?: string;
  errorDescription?: string | ((error: Error, variables: TVariables) => string);
}

export function handleMutationError(error: unknown, title = 'Operation Failed') {
  let description = 'An unexpected error occurred. Please try again.';

  if (error instanceof AppError) {
    description = error.message;
  } else if (error instanceof Error) {
    description = error.message;
  } else if (typeof error === 'string') {
    description = error;
  }

  toast({
    title,
    description,
    variant: 'destructive',
  });
}

export function handleMutationSuccess<TData = any, TVariables = any>(
  data: TData,
  variables: TVariables,
  options?: MutationToastOptions<TData, TVariables>
) {
  const title = options?.successTitle || 'Success';
  let description: string | undefined;

  if (typeof options?.successDescription === 'function') {
    description = options.successDescription(data, variables);
  } else if (options?.successDescription) {
    description = options.successDescription;
  }

  toast({
    title,
    description,
  });
}

export function createMutationToast<TData = any, TVariables = any>(
  options: MutationToastOptions<TData, TVariables>
) {
  return {
    onSuccess: (data: TData, variables: TVariables) => {
      handleMutationSuccess(data, variables, options);
    },
    onError: (error: Error, variables: TVariables) => {
      const title = options.errorTitle || 'Operation Failed';
      let description: string | undefined;
      if (typeof options.errorDescription === 'function') {
        description = options.errorDescription(error, variables);
      } else if (options.errorDescription) {
        description = options.errorDescription;
      }
      handleMutationError(description || error, title);
    },
  };
}

