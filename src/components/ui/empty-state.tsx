import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className,
  size = 'md' 
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  };

  const iconSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className={cn(
        "flex flex-col items-center justify-center text-center space-y-4",
        sizeClasses[size]
      )}>
        {icon && (
          <div className={cn(
            "text-muted-foreground/50",
            iconSizeClasses[size]
          )}>
            {icon}
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground max-w-sm">
              {description}
            </p>
          )}
        </div>
        {action && (
          <Button 
            onClick={action.onClick}
            variant={action.variant || 'default'}
            className="mt-4"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Predefined empty states for common scenarios
export function NoDataFound({ 
  title = "No data found",
  description = "There's no data to display at the moment.",
  onRefresh,
  className
}: {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M9 9h6m-6 4h4"/>
        </svg>
      }
      title={title}
      description={description}
      action={onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
        variant: "outline"
      } : undefined}
      className={className}
    />
  );
}

export function ComingSoon({ 
  title = "Coming Soon",
  description = "This feature is under development and will be available soon.",
  className
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      }
      title={title}
      description={description}
      className={className}
    />
  );
}