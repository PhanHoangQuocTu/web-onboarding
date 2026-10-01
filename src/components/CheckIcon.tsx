import type { SVGProps } from 'react'

type CheckIconProps = SVGProps<SVGSVGElement> & { size?: number | string }

export function CheckIcon({
  size = 14,
  width,
  height,
  color,
  stroke,
  strokeWidth = 1.98333,
  strokeLinecap = 'round',
  strokeLinejoin = 'round',
  ...svgProps
}: CheckIconProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...svgProps}
    >
      <path
        d="M3.5 7.29166L5.83333 9.62499L10.5 4.66666"
        stroke={stroke ?? color ?? 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap={strokeLinecap}
        strokeLinejoin={strokeLinejoin}
      />
    </svg>
  )
}
