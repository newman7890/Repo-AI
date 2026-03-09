import { Skeleton } from "@/components/ui/skeleton";

const ProcessingSkeleton = () => {
  return (
    <div className="flex flex-col gap-5 w-full animate-fade-in">
      {/* Image skeleton with shimmer */}
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-muted">
        <Skeleton className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Creating magic...</p>
        </div>
      </div>

      {/* Button skeletons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="flex-1 h-12 rounded-md" />
        <Skeleton className="h-12 w-12 rounded-md" />
        <Skeleton className="h-12 w-12 rounded-md" />
      </div>
    </div>
  );
};

export default ProcessingSkeleton;
