export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 h-24" />
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl h-64" />
    </div>
  )
}
