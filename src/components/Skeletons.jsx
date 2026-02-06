// React is available globally via script tags in index.html
// Skeleton loaders for progressive UI rendering

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="skeleton h-6 w-32 mb-4"></div>
    <div className="skeleton h-24 w-full mb-3"></div>
    <div className="skeleton h-4 w-3/4"></div>
  </div>
);

export const SkeletonNodeCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="skeleton h-6 w-24"></div>
      <div className="skeleton h-8 w-16 rounded-full"></div>
    </div>
    <div className="space-y-3">
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-4 w-5/6"></div>
      <div className="skeleton h-4 w-4/6"></div>
    </div>
  </div>
);

export const SkeletonClusterMap = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="skeleton h-6 w-40 mb-6"></div>
    <div className="skeleton h-96 w-full"></div>
  </div>
);
