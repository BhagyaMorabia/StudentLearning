export default function LoadingQuiz() {
  return (
    <div className="w-full max-w-[720px] mx-auto py-8 px-6 animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div className="h-6 w-48 bg-surface-elevated rounded" />
        <div className="h-8 w-20 bg-surface-elevated rounded" />
      </div>
      <div className="h-1.5 w-full bg-surface-elevated rounded mb-8" />
      <div className="h-32 w-full bg-surface-elevated rounded mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 w-full bg-surface-elevated rounded" />
        ))}
      </div>
    </div>
  );
}
