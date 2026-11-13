import * as React from "react";
import { Camera, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Brand map pin: a crimson drop with a camera (or an ink drop with a lime
 * lock for a locked premium spot). Use inside a react-map-gl <Marker
 * anchor="bottom">. Animations live in globals.css (.map-pin*): it drops in
 * when it appears, lifts on hover, and jumps while `highlighted`.
 */
export function MapPinIcon({
  locked = false,
  highlighted = false,
  index = 0,
  className,
}: {
  locked?: boolean;
  highlighted?: boolean;
  /** Position in the list; staggers the drop-in a little. */
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("map-pin", className)}
      data-highlight={highlighted || undefined}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <div
        className={cn(
          "map-pin-drop",
          locked ? "bg-foreground text-lime" : "bg-[#D41E45] text-white",
        )}
      >
        {locked ? (
          <Lock className="map-pin-icon h-4 w-4" aria-hidden />
        ) : (
          <Camera className="map-pin-icon h-4 w-4" aria-hidden />
        )}
      </div>
    </div>
  );
}
