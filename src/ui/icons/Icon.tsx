import type { SVGProps } from "react";
import { cx } from "../cx";
import { ICON_BODIES, ICON_VIEWBOX, type IconName } from "./generated";

export type { IconName };

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** Accessible label; without it the icon is decorative. */
  label?: string;
}

/** Vector icon (game-icons.net, CC BY 3.0) drawn in `currentColor`. */
export function Icon({ name, label, className, ...props }: IconProps) {
  return (
    <svg
      viewBox={ICON_VIEWBOX}
      className={cx("inline-block h-[1em] w-[1em] shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: ICON_BODIES[name] }}
      {...props}
    />
  );
}

/** The same icon inside another SVG (the map), positioned and sized in that SVG's units. */
export function SvgIcon({ name, x, y, size, color }: { name: IconName; x: number; y: number; size: number; color: string }) {
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox={ICON_VIEWBOX} color={color} dangerouslySetInnerHTML={{ __html: ICON_BODIES[name] }} />
  );
}
