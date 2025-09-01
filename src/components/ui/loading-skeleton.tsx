import { cn } from "@/lib/utils";

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave';
}

export function LoadingSkeleton({ 
  className, 
  variant = 'default',
  animation = 'pulse',
  ...props 
}: LoadingSkeletonProps) {
  const baseClasses = "bg-muted animate-pulse rounded";
  
  const variantClasses = {
    default: "h-4 w-full",
    text: "h-4 w-3/4",
    circular: "h-10 w-10 rounded-full",
    rectangular: "h-24 w-full rounded-lg"
  };

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-pulse-glow"
  };

  return (
    <div 
      className={cn(
        baseClasses, 
        variantClasses[variant],
        animationClasses[animation],
        className
      )} 
      {...props} 
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4 animate-fade-in">
      <div className="flex items-center space-x-4">
        <LoadingSkeleton variant="circular" />
        <div className="space-y-2 flex-1">
          <LoadingSkeleton className="h-4 w-1/2" />
          <LoadingSkeleton variant="text" />
        </div>
      </div>
      <div className="space-y-2">
        <LoadingSkeleton />
        <LoadingSkeleton variant="text" />
        <LoadingSkeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="bg-gradient-hero rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <LoadingSkeleton className="h-8 w-64 bg-white/20" />
            <LoadingSkeleton className="h-4 w-48 bg-white/20" />
          </div>
          <div className="text-right space-y-1">
            <LoadingSkeleton className="h-8 w-16 bg-white/20" />
            <LoadingSkeleton className="h-4 w-24 bg-white/20" />
          </div>
        </div>
      </div>
      
      {/* Grid skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 border rounded">
          <LoadingSkeleton variant="circular" className="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton className="h-4 w-1/3" />
            <LoadingSkeleton variant="text" />
          </div>
          <LoadingSkeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}