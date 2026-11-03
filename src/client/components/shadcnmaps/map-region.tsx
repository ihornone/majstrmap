'use client'

import { cn } from '@/lib/utils'

import { useMapContext } from './map-context'
import type { MapRegionData, RegionEvent } from './types'

export interface MapRegionProps extends MapRegionData {
  selected?: boolean
  hovered?: boolean
  disabled?: boolean
  className?: string
  labelClassName?: string
  renderLabel?: boolean
  onClick?: (event: RegionEvent) => void
  onEnter?: (event: RegionEvent) => void
  onLeave?: (event: RegionEvent) => void
  onMove?: (event: RegionEvent) => void
}

export function MapRegion({
  id,
  path,
  name,
  abbreviation,
  labelX,
  labelY,
  style,
  metadata,
  selected,
  disabled,
  className,
  labelClassName,
  renderLabel = false,
  onClick,
  onEnter,
  onLeave,
  onMove,
}: MapRegionProps) {
  const { selectedRegion } = useMapContext()

  const isSelected = selected ?? selectedRegion === id

  const regionData: MapRegionData = {
    id,
    path,
    name,
    abbreviation,
    labelX,
    labelY,
    style,
    metadata,
  }

  return (
    <g data-slot='map-region-group' className='group'>
      <path
        data-slot='map-region'
        d={path}
        role='button'
        tabIndex={-1}
        aria-label={name ?? id}
        aria-pressed={isSelected}
        aria-disabled={disabled || undefined}
        style={style}
        className={cn(
          'cursor-pointer stroke-[#64748b]/50 stroke-[0.9] outline-none transition-colors duration-150',
          'hover:stroke-sky-600',
          isSelected && '!fill-[#0284c7] stroke-sky-700',
          disabled && 'cursor-default opacity-60',
          className
        )}
        onClick={(nativeEvent) => {
          if (disabled) {
            return
          }

          onClick?.({ region: regionData, nativeEvent })
        }}
        onMouseEnter={(nativeEvent) => {
          if (disabled) {
            return
          }

          onEnter?.({ region: regionData, nativeEvent })
        }}
        onMouseLeave={(nativeEvent) => {
          if (disabled) {
            return
          }

          onLeave?.({ region: regionData, nativeEvent })
        }}
        onMouseMove={(nativeEvent) => {
          if (disabled) {
            return
          }

          onMove?.({ region: regionData, nativeEvent })
        }}
      />
      {renderLabel && abbreviation && labelX !== undefined && labelY !== undefined ? (
        <text
          data-slot='map-region-label'
          x={labelX}
          y={labelY}
          aria-hidden='true'
          textAnchor='middle'
          dominantBaseline='middle'
          style={{
            paintOrder: 'stroke fill',
            stroke: 'rgba(255, 255, 255, 0.95)',
            strokeWidth: '2px',
            strokeLinejoin: 'round',
          }}
          className={cn(
            'pointer-events-none fill-slate-900 font-bold tracking-tight select-none',
            labelClassName
          )}
        >
          {abbreviation}
        </text>
      ) : null}
    </g>
  )
}
