'use client'

import { cn } from '@/lib/utils'
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { MapProvider, useMapContext } from './map-context'
import { MapListbox } from './map-listbox'
import { MapRegion } from './map-region'
import type {
  MapData,
  MapRegionData,
  RegionEvent,
  RegionOverride,
  ZoomConfig,
} from './types'

export interface MapProps {
  data: MapData
  selectedRegion?: string | null
  regions?: RegionOverride[]
  disabledRegions?: string[]
  onRegionClick?: (event: RegionEvent) => void
  onRegionEnter?: (event: RegionEvent) => void
  onRegionLeave?: (event: RegionEvent) => void
  showLabels?: boolean
  className?: string
  children?: ReactNode
  'aria-label'?: string
  enableZoom?: boolean
  zoomConfig?: Partial<ZoomConfig>
  controls?: ReactNode
}

function parseViewBox(viewBox: string) {
  const [x = 0, y = 0, width = 0, height = 0] = viewBox
    .split(/\s+/)
    .map(Number)
  return { x, y, width, height }
}

function MapInner({
  data,
  regions,
  disabledRegions,
  onRegionClick,
  onRegionEnter,
  onRegionLeave,
  showLabels = true,
  className,
  children,
  'aria-label': ariaLabel,
  enableZoom = false,
}: MapProps) {
  const {
    selectedRegion,
    setSelectedRegion,
    focusedRegion,
    zoomState,
    setZoomState,
    zoomConfig,
  } = useMapContext()
  const descId = useId()
  const [announcement, setAnnouncement] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const isPanningRef = useRef(false)
  const [isGesture, setIsGesture] = useState(false)
  const dragStartRef = useRef<{
    x: number
    y: number
    tx: number
    ty: number
  } | null>(null)
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null)

  const regionOverrides = useMemo(() => {
    return new Map(regions?.map((region) => [region.id, region]) ?? [])
  }, [regions])

  const disabledRegionSet = useMemo(() => {
    return new Set(disabledRegions ?? [])
  }, [disabledRegions])

  const mergedRegions = useMemo(() => {
    return data.regions.map((baseRegion) => {
      const override = regionOverrides.get(baseRegion.id)
      return {
        ...baseRegion,
        ...override,
      }
    })
  }, [data.regions, regionOverrides])

  const mapLabel = ariaLabel ?? data.name

  const viewBox = useMemo(() => parseViewBox(data.viewBox), [data.viewBox])
  const cx = viewBox.x + viewBox.width / 2
  const cy = viewBox.y + viewBox.height / 2

  const clampTranslate = useCallback(
    (tx: number, ty: number, scale: number) => {
      const maxPanX = viewBox.width * Math.max(scale, 1) * 3
      const maxPanY = viewBox.height * Math.max(scale, 1) * 3
      return {
        tx: Math.max(-maxPanX, Math.min(maxPanX, tx)),
        ty: Math.max(-maxPanY, Math.min(maxPanY, ty)),
      }
    },
    [viewBox]
  )

  useEffect(() => {
    if (!enableZoom) return
    const svg = svgRef.current
    if (!svg) return

    const handleWheel = (e: WheelEvent) => {
      if (zoomState.scale <= zoomConfig.minZoom && e.deltaY > 0) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -zoomConfig.zoomStep : zoomConfig.zoomStep

      setZoomState((prev) => {
        const newScale = Math.max(
          zoomConfig.minZoom,
          Math.min(zoomConfig.maxZoom, prev.scale + delta)
        )
        if (newScale === prev.scale) return prev

        if (newScale <= 1) {
          return {
            scale: newScale,
            translateX: prev.translateX * 0.5,
            translateY: prev.translateY * 0.5,
          }
        }

        const rect = svg.getBoundingClientRect()
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top
        const svgX = (cursorX / rect.width) * viewBox.width + viewBox.x
        const svgY = (cursorY / rect.height) * viewBox.height + viewBox.y

        const dScale = newScale - prev.scale
        const newTx = prev.translateX - dScale * (svgX - cx)
        const newTy = prev.translateY - dScale * (svgY - cy)
        const clamped = clampTranslate(newTx, newTy, newScale)

        return {
          scale: newScale,
          translateX: clamped.tx,
          translateY: clamped.ty,
        }
      })
    }

    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [enableZoom, zoomConfig, zoomState.scale, setZoomState, viewBox, cx, cy, clampTranslate])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!enableZoom || e.button !== 0) return
      const target = e.target as Element
      if (target.closest('[data-slot="map-region"]')) {
        isPanningRef.current = false
        setIsGesture(true)
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          tx: zoomState.translateX,
          ty: zoomState.translateY,
        }
        return
      }
      isPanningRef.current = false
      setIsGesture(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: zoomState.translateX,
        ty: zoomState.translateY,
      }
    },
    [enableZoom, zoomState.translateX, zoomState.translateY]
  )

  useEffect(() => {
    if (!enableZoom) return

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y

      if (!isPanningRef.current && Math.hypot(dx, dy) < 3) return
      isPanningRef.current = true

      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const svgDx = (dx / rect.width) * viewBox.width
      const svgDy = (dy / rect.height) * viewBox.height

      const newTx = dragStartRef.current.tx + svgDx
      const newTy = dragStartRef.current.ty + svgDy
      const clamped = clampTranslate(newTx, newTy, zoomState.scale)

      setZoomState((prev) => ({
        ...prev,
        translateX: clamped.tx,
        translateY: clamped.ty,
      }))
    }

    const handlePointerUp = () => {
      if (!dragStartRef.current) return
      dragStartRef.current = null
      requestAnimationFrame(() => {
        isPanningRef.current = false
        setIsGesture(false)
      })
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [enableZoom, viewBox, zoomState.scale, setZoomState, clampTranslate])

  useEffect(() => {
    if (!enableZoom) return
    const svg = svgRef.current
    if (!svg) return

    const getTouchDist = (e: TouchEvent) => {
      const a = e.touches[0]
      const b = e.touches[1]
      if (!a || !b) return null
      const dx = a.clientX - b.clientX
      const dy = a.clientY - b.clientY
      return Math.hypot(dx, dy)
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dist = getTouchDist(e)
        if (dist !== null) {
          pinchStartRef.current = { dist, scale: zoomState.scale }
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) {
        e.preventDefault()
        const dist = getTouchDist(e)
        if (dist !== null) {
          const scaleRatio = dist / pinchStartRef.current.dist
          const newScale = Math.max(
            zoomConfig.minZoom,
            Math.min(
              zoomConfig.maxZoom,
              pinchStartRef.current.scale * scaleRatio
            )
          )
          setZoomState((prev) => ({ ...prev, scale: newScale }))
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartRef.current = null
      }
    }

    svg.addEventListener('touchstart', handleTouchStart, { passive: false })
    svg.addEventListener('touchmove', handleTouchMove, { passive: false })
    svg.addEventListener('touchend', handleTouchEnd)
    return () => {
      svg.removeEventListener('touchstart', handleTouchStart)
      svg.removeEventListener('touchmove', handleTouchMove)
      svg.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enableZoom, zoomConfig, zoomState.scale, setZoomState])

  const shouldSuppressClick = useCallback(() => {
    return enableZoom && isPanningRef.current
  }, [enableZoom])

  const svgContent = (
    <>
      {mergedRegions.map((region) => {
        const disabled = region.disabled || disabledRegionSet.has(region.id)

        return (
          <MapRegion
            key={region.id}
            id={region.id}
            name={region.name}
            path={region.path}
            abbreviation={showLabels ? region.abbreviation : undefined}
            labelX={showLabels ? region.labelX : undefined}
            labelY={showLabels ? region.labelY : undefined}
            style={region.style}
            metadata={region.metadata}
            className={region.className}
            labelClassName={region.labelClassName}
            disabled={disabled}
            renderLabel={false}
            onClick={(event) => {
              if (shouldSuppressClick()) return
              const isCurrentlySelected = selectedRegion === region.id
              setSelectedRegion(isCurrentlySelected ? null : region.id)
              setAnnouncement(
                isCurrentlySelected
                  ? `${region.name} deselected`
                  : `${region.name} selected`
              )
              onRegionClick?.(event)
            }}
            onEnter={onRegionEnter}
            onLeave={onRegionLeave}
          />
        )
      })}
      {showLabels ? (
        <g data-slot='map-labels-layer' className='pointer-events-none select-none'>
          {mergedRegions.map((region) => {
            if (!region.abbreviation || region.labelX === undefined || region.labelY === undefined) {
              return null
            }
            const len = region.abbreviation.length
            const fontSize = len > 13 ? '5.0px' : len > 9 ? '5.6px' : '6.5px'

            return (
              <text
                key={`label-${region.id}`}
                data-slot='map-region-label'
                x={region.labelX}
                y={region.labelY}
                aria-hidden='true'
                textAnchor='middle'
                dominantBaseline='middle'
                style={{
                  fontSize,
                  paintOrder: 'stroke fill',
                  stroke: '#ffffff',
                  strokeWidth: '2.4px',
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                }}
                className={cn(
                  'pointer-events-none fill-slate-900 font-bold tracking-tight select-none',
                  region.labelClassName
                )}
              >
                {region.abbreviation}
              </text>
            )
          })}
        </g>
      ) : null}
      {children}
      <FocusRingOverlay focusedRegion={focusedRegion} regions={mergedRegions} />
    </>
  )

  return (
    <>
      <svg
        ref={svgRef}
        data-slot='map'
        role='group'
        aria-label={mapLabel}
        aria-describedby={descId}
        viewBox={data.viewBox}
        className={cn('h-full w-full', className)}
        style={
          enableZoom
            ? {
                touchAction: zoomState.scale <= zoomConfig.minZoom ? 'pan-y' : 'none',
                cursor: isGesture ? 'grabbing' : 'grab',
              }
            : undefined
        }
        onPointerDown={enableZoom ? handlePointerDown : undefined}
      >
        <desc id={descId}>
          Interactive map. Tab to focus, arrow keys to navigate between regions,
          Enter or Space to select, Escape to clear.
        </desc>
        {enableZoom ? (
          <g
            data-slot='map-zoom-layer'
            transform={`translate(${cx + zoomState.translateX}, ${cy + zoomState.translateY}) scale(${zoomState.scale}) translate(${-cx}, ${-cy})`}
            style={{
              transition: isGesture ? 'none' : 'transform 200ms ease-out',
              willChange: 'transform',
            }}
          >
            {svgContent}
          </g>
        ) : (
          svgContent
        )}
      </svg>
      <MapListbox
        regions={mergedRegions}
        disabledRegions={disabledRegionSet}
        label={mapLabel}
        onSelect={(region) => {
          const isCurrentlySelected = selectedRegion === region.id
          setAnnouncement(
            isCurrentlySelected
              ? `${region.name} deselected`
              : `${region.name} selected`
          )
          onRegionClick?.({ region, nativeEvent: null })
        }}
      />
      <div
        role='status'
        aria-live='polite'
        aria-atomic='true'
        className='sr-only'
      >
        {announcement}
      </div>
    </>
  )
}

function FocusRingOverlay({
  focusedRegion,
  regions,
}: {
  focusedRegion: string | null
  regions: MapRegionData[]
}) {
  if (!focusedRegion) return null
  const region = regions.find((r) => r.id === focusedRegion)
  if (!region) return null

  return (
    <path
      data-slot='map-focus-ring'
      d={region.path}
      aria-hidden='true'
      className='pointer-events-none fill-none stroke-map-region-focus-ring stroke-2'
    />
  )
}

function MapRoot({
  enableZoom,
  zoomConfig,
  controls,
  selectedRegion: selectedRegionProp,
  ...props
}: MapProps) {
  return (
    <MapProvider
      zoomConfig={zoomConfig}
      selectedRegion={selectedRegionProp}
    >
      <div data-slot='map-container' className='relative w-full h-full overflow-hidden'>
        <MapInner enableZoom={enableZoom} {...props} />
        {controls}
      </div>
    </MapProvider>
  )
}

export { MapRoot as Map }
