export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="surface-panel-soft p-6">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-4 rounded-full bg-white/8"
            style={{ width: `${100 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
