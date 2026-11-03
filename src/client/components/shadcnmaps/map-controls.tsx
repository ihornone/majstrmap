'use client'

import { cn } from '@/lib/utils'
import { useMapContext } from './map-context'
import { Button } from '@/components/ui/button'
import { Plus, Minus, RotateCcw } from 'lucide-react'

export interface MapControlsProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center'
  className?: string
}

const positionClasses: Record<string, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-14 left-4 sm:left-6',
  'bottom-right': 'bottom-14 right-4 sm:right-6',
  'bottom-center': 'bottom-14 left-1/2 -translate-x-1/2',
}

export function MapControls({
  position = 'bottom-left',
  className,
}: MapControlsProps) {
  const { zoomIn, zoomOut, resetZoom, zoomState, zoomConfig } = useMapContext()

  const atMaxZoom = zoomState.scale >= zoomConfig.maxZoom
  const atMinZoom = zoomState.scale <= zoomConfig.minZoom

  return (
    <div
      data-slot='map-controls'
      className={cn(
        'absolute z-20 flex flex-col items-center gap-2.5 pointer-events-auto no-scrollbar',
        positionClasses[position],
        className
      )}
    >
      { }
      <Button
        variant='threedIcon'
        size='iconLg'
        onClick={zoomIn}
        disabled={atMaxZoom}
        title='Збільшити масштаб (+)'
        aria-label='Збільшити масштаб'
        className='h-11 w-11 rounded-xl'
      >
        <Plus className='w-5 h-5 stroke-[2.5]' />
      </Button>

      { }
      <Button
        variant='threedIcon'
        size='iconLg'
        onClick={zoomOut}
        disabled={atMinZoom}
        title='Зменшити масштаб (−)'
        aria-label='Зменшити масштаб'
        className='h-11 w-11 rounded-xl'
      >
        <Minus className='w-5 h-5 stroke-[2.5]' />
      </Button>

      { }
      <Button
        variant='threedIcon'
        size='iconLg'
        onClick={resetZoom}
        title='Скинути до повного вигляду'
        aria-label='Скинути до повного вигляду'
        className='h-11 w-11 rounded-xl'
      >
        <RotateCcw className='w-4 h-4 stroke-[2.5]' />
      </Button>
    </div>
  )
}
