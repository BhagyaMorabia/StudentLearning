export default function LoadingSubtopic() {
  return (
    <div className="w-full max-w-[720px] mx-auto px-6 pt-12 space-y-6 animate-pulse">
      <div className="h-3 w-48 bg-surface-elevated rounded" />
      <div className="h-12 w-72 bg-surface-elevated rounded" />
      <div className="h-4 w-40 bg-surface-elevated rounded" />
      <div className="flex gap-2 border-b border-surface-stroke pt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 bg-surface-elevated rounded" />
        ))}
      </div>
      <div className="space-y-3 pt-8">
        <div className="h-4 w-full bg-surface-elevated rounded" />
        <div className="h-4 w-full bg-surface-elevated rounded" />
        <div className="h-4 w-5/6 bg-surface-elevated rounded" />
        <div className="h-32 w-full bg-surface-elevated rounded mt-6" />
      </div>
    </div>
  );
}
