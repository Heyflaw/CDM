/* eslint-disable @next/next/no-img-element */

export function TeamLabel({
  name,
  flag,
  align = "left",
}: {
  name: string;
  flag: string | null;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {flag ? (
        <img
          src={flag}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] shrink-0 object-contain"
        />
      ) : (
        <span className="h-[22px] w-[22px] shrink-0" />
      )}
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}
