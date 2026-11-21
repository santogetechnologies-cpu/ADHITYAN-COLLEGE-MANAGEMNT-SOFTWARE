import { QueryClient, MutationCache } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export const queryClient = new QueryClient({
  // A failed save must never be silent: if the screen did not handle the error itself, say so.
  mutationCache: new MutationCache({
    onError: (error: any, _vars, _ctx, mutation) => {
      if (mutation.options.onError || (mutation.meta as any)?.silent) return;
      toast({ title: 'Could not save', description: error?.message || 'Please try again.', variant: 'destructive' });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error: any) => {
        if (
          error?.status === 401 ||
          error?.status === 403 ||
          error?.code === '42501' ||
          error?.code === 'PGRST116' ||
          error?.message?.includes?.('Permission denied')
        ) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

