/** Shimmer skeleton card for loading state. Predictable placeholder for AAC users. */
export function SkeletonCard() {
  return (
    <div className="aac-skeleton" aria-hidden="true">
      <div className="skeleton-shimmer" />
    </div>
  );
}

/** Renders N skeleton cards in a grid-like layout. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
