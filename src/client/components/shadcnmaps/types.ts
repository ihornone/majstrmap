import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  TouchEvent,
} from 'react'

export interface MapRegionData {
  id: string
  name: string
  path: string
  abbreviation?: string
  labelX?: number
  labelY?: number
  style?: CSSProperties
  metadata?: Record<string, unknown>
}

export interface MapData {
  id: string
  name: string
  viewBox: string
  regions: MapRegionData[]
}

export interface RegionEvent {
  region: MapRegionData
  nativeEvent:
    | MouseEvent<SVGPathElement>
    | TouchEvent<SVGPathElement>
    | FocusEvent<SVGPathElement>
    | KeyboardEvent<SVGPathElement>
    | null
}

export interface RegionOverride {
  id: string
  name?: string
  abbreviation?: string
  labelX?: number
  labelY?: number
  style?: CSSProperties
  metadata?: Record<string, unknown>
  className?: string
  labelClassName?: string
  disabled?: boolean
}

export interface ZoomState {
  scale: number
  translateX: number
  translateY: number
}

export interface ZoomConfig {
  minZoom: number
  maxZoom: number
  zoomStep: number
  panStep: number
}
