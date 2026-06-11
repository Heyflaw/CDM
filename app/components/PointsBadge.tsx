export function PointsBadge({ points }: { points: number }) {
  const positive = points > 0;
  return (
    <span
      className={`chip ${
        positive
          ? "bg-accent/15 text-accent"
          : "bg-surface-2 text-muted"
      }`}
    >
      +{points} pt{points > 1 ? "s" : ""}
    </span>
  );
}
