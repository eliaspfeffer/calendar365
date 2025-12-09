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
    <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border z-50">
      <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-8 w-8">
        <ZoomOut className="h-4 w-4" />
      </Button>

      <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-center">
        {Math.round(scale * 100)}%
      </span>

      <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-8 w-8">
        <ZoomIn className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button variant="ghost" size="icon" onClick={onReset} className="h-8 w-8">
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
