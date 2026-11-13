import { cn } from "@/lib/utils";

/**
 * The two slanted bars (lime + crimson) from the Aquarelle logo, redrawn as
 * SVG from the original artwork (same angles, proportions and colors).
 * Not mirrored in RTL: it is a logo, not a direction.
 */
export function BrandMark({
  className,
  title,
}: {
  className?: string;
  /** Accessible name; omit when a visible label sits next to it. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 439 687"
      className={cn("h-6 w-auto shrink-0 overflow-visible", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <polygon className="brand-bar brand-bar-1" points="144,0 251,0 107,687 0,687" fill="#CFD731" />
      <polygon className="brand-bar brand-bar-2" points="332,0 439,0 295,687 188,687" fill="#E6284F" />
    </svg>
  );
}
