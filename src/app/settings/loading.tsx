export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-24 bg-gray-200 rounded" />
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50">
            <div className="h-4 w-28 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl h-48" />
    </div>
  )
}
