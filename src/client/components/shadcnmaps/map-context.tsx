'use client'

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import type { ZoomConfig, ZoomState } from './types'

const DEFAULT_ZOOM_STATE: ZoomState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
}

const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  minZoom: 0.6,
  maxZoom: 8,
  zoomStep: 0.3,
  panStep: 50,
}

interface MapContextValue {
  selectedRegion: string | null
  setSelectedRegion: Dispatch<SetStateAction<string | null>>
  focusedRegion: string | null
  setFocusedRegion: Dispatch<SetStateAction<string | null>>
  zoomState: ZoomState
  setZoomState: Dispatch<SetStateAction<ZoomState>>
  zoomConfig: ZoomConfig
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

const MapContext = createContext<MapContextValue | null>(null)

interface MapProviderProps {
  children: React.ReactNode
  selectedRegion?: string | null
  zoomConfig?: Partial<ZoomConfig>
}

export function MapProvider({
  children,
  selectedRegion: selectedRegionProp,
  zoomConfig: zoomConfigProp,
}: MapProviderProps) {
  const isControlled = selectedRegionProp !== undefined
  const [uncontrolledRegion, setUncontrolledRegion] = useState<string | null>(
    null
  )
  const selectedRegion = isControlled ? selectedRegionProp : uncontrolledRegion
  const noop = useCallback<
    Dispatch<SetStateAction<string | null>>
  >(() => {}, [])
  const setSelectedRegion = isControlled ? noop : setUncontrolledRegion
  const [focusedRegion, setFocusedRegion] = useState<string | null>(null)
  const [zoomState, setZoomState] = useState<ZoomState>(DEFAULT_ZOOM_STATE)

  const zoomConfig = useMemo<ZoomConfig>(
    () => ({ ...DEFAULT_ZOOM_CONFIG, ...zoomConfigProp }),
    [zoomConfigProp]
  )

  const zoomIn = useCallback(() => {
    setZoomState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale + zoomConfig.zoomStep, zoomConfig.maxZoom),
    }))
  }, [zoomConfig])

  const zoomOut = useCallback(() => {
    setZoomState((prev) => {
      const newScale = Math.max(prev.scale - zoomConfig.zoomStep, zoomConfig.minZoom)
      if (newScale <= 1) {
        return {
          scale: newScale,
          translateX: prev.translateX * 0.5,
          translateY: prev.translateY * 0.5,
        }
      }
      return { ...prev, scale: newScale }
    })
  }, [zoomConfig])

  const resetZoom = useCallback(() => {
    setZoomState(DEFAULT_ZOOM_STATE)
  }, [])

  const value = useMemo<MapContextValue>(
    () => ({
      selectedRegion,
      setSelectedRegion,
      focusedRegion,
      setFocusedRegion,
      zoomState,
      setZoomState,
      zoomConfig,
      zoomIn,
      zoomOut,
      resetZoom,
    }),
    [
      focusedRegion,
      selectedRegion,
      setSelectedRegion,
      zoomState,
      zoomConfig,
      zoomIn,
      zoomOut,
      resetZoom,
    ]
  )

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export function useMapContext() {
  const context = useContext(MapContext)
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider.')
  }

  return context
}
