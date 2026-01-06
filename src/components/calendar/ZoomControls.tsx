import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  scale: number;
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset, scale }: ZoomControlsProps) {
  return (
    <div
      data-tour-id="zoom-controls"
      className="zoom-controls fixed bottom-4 right-4 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border z-50 touch-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-7 w-7">
        <ZoomOut className="h-4 w-4" />
      </Button>

      <span className="text-xs font-medium text-muted-foreground min-w-[2.5rem] text-center">
        {Math.round(scale * 100)}%
      </span>

      <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-7 w-7">
        <ZoomIn className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button variant="ghost" size="icon" onClick={onReset} className="h-7 w-7">
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
