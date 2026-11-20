import React from 'react';
import { TableSkeleton, CardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState, NoDataFound } from '@/components/ui/empty-state';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DataStateProps {
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingVariant?: 'table' | 'card' | 'custom';
  loadingComponent?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  children: React.ReactNode;
}

export function DataState({
  isLoading,
  isError = false,
  error = null,
  isEmpty = false,
  onRetry,
  loadingVariant = 'table',
  loadingComponent,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data registered for this view.',
  emptyAction,
  children,
}: DataStateProps) {
  if (isLoading) {
    if (loadingComponent) return <>{loadingComponent}</>;
    return loadingVariant === 'card' ? <CardSkeleton /> : <TableSkeleton rows={4} />;
  }

  if (isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 my-4">
        <CardContent className="py-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-destructive">Data Retrieval Failed</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              {error?.message || 'Unable to load records from the database. Please try again.'}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry Request
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return emptyAction ? (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    ) : (
      <NoDataFound
        title={emptyTitle}
        description={emptyDescription}
        onRefresh={onRetry}
      />
    );
  }

  return <>{children}</>;
}

export default DataState;

