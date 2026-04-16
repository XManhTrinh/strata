"use client";

interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({ src, name, size = "sm" }: AvatarProps) {
  const px = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-[10px]";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${px} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${px} rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center justify-center shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}
