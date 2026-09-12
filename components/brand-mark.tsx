import Image from "next/image";

export function BrandMark({ logoUrl, compact = false }: { logoUrl?: string | null; compact?: boolean }) {
  if (logoUrl) {
    return <Image src={logoUrl} alt="Laus Sit" width={compact ? 98 : 150} height={compact ? 48 : 72} className="h-auto w-auto object-contain" priority />;
  }

  return (
    <svg
      viewBox="0 0 176 88"
      role="img"
      aria-label="Laus Sit"
      className={compact ? "h-12 w-24" : "h-[4.8rem] w-36 sm:w-44"}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path strokeWidth="5.5" d="M18 9c-1 14-1 28 0 39 8 1 17 1 25 1M54 47c1-18 5-32 11-32 7 0 12 17 14 31M57 34c7-2 13-2 19 0M88 15c0 21 2 32 10 32 9 0 13-13 14-31M139 15c-8 7-13 13-14 19 5 2 13 4 17 9 5 8-5 14-18 11" />
        <path strokeWidth="4.5" d="M8 57c50-4 102-3 160 3M112 45c1 12 1 25 2 37M101 58h27M12 73c7-7 19-10 26-6 6 3 5 8 0 11-6 4-17 5-27 4M64 64v17M63 56h1" />
      </g>
    </svg>
  );
}
