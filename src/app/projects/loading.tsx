export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-28 bg-gray-200 rounded-lg" />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
            <div className="h-4 w-36 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="ml-auto h-5 w-16 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
