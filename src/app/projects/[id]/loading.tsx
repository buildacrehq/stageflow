export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-6 w-48 bg-gray-200 rounded" />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-4 w-28 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="ml-auto h-5 w-14 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
