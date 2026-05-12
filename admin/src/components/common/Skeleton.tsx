interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-gray-200/80 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 6, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="overflow-x-auto" role="status" aria-label="Yükleniyor">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left px-5 py-3">
                <Skeleton className="h-3 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-5 py-4">
                  {c === 0 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </div>
                  ) : (
                    <Skeleton
                      className={`h-3 ${c === columns - 1 ? 'w-16' : 'w-28'}`}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}

interface SkeletonCardProps {
  count?: number;
  className?: string;
}

export function SkeletonStatCards({ count = 4, className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(count, 4)} gap-4 ${className}`}
      role="status"
      aria-label="Yükleniyor"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      ))}
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}

export default Skeleton;
