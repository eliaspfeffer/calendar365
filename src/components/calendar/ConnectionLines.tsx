import { useEffect, useState } from 'react';
import { StickyNote, NoteConnection } from '@/types/calendar';

interface ConnectionLinesProps {
  connections: NoteConnection[];
  notes: StickyNote[];
  hoveredNoteId: string | null;
  showAll?: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface Position {
  x: number;
  y: number;
}

export function ConnectionLines({
  connections,
  notes,
  hoveredNoteId,
  showAll = false,
  containerRef,
}: ConnectionLinesProps) {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;

      const newPositions = new Map<string, Position>();
      const container = containerRef.current;

      notes.forEach((note) => {
        const noteElement = container.querySelector(`[data-note-id="${note.id}"]`);
        if (noteElement) {
          // Use offsetLeft/offsetTop to get position in untransformed space
          const el = noteElement as HTMLElement;
          let x = el.offsetWidth / 2;
          let y = el.offsetHeight / 2;
          
          // Walk up the offset parents to get total offset within container
          let current: HTMLElement | null = el;
          while (current && current !== container) {
            x += current.offsetLeft;
            y += current.offsetTop;
            current = current.offsetParent as HTMLElement | null;
          }
          
          newPositions.set(note.id, { x, y });
        }
      });

      setPositions(newPositions);
    };

    updatePositions();

    // Update on resize
    window.addEventListener('resize', updatePositions);

    // Use MutationObserver to detect DOM changes
    const observer = new MutationObserver(() => {
      requestAnimationFrame(updatePositions);
    });
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', updatePositions);
      observer.disconnect();
    };
  }, [notes, containerRef]);

  const visibleConnections = showAll
    ? connections
    : hoveredNoteId
      ? connections.filter(
          (c) => c.source_note_id === hoveredNoteId || c.target_note_id === hoveredNoteId
        )
      : [];

  if (visibleConnections.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="hsl(var(--primary))"
          />
        </marker>
      </defs>
      {visibleConnections.map((connection) => {
        const sourcePos = positions.get(connection.source_note_id);
        const targetPos = positions.get(connection.target_note_id);

        if (!sourcePos || !targetPos) return null;

        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Shorten line to not overlap with notes
        const padding = 20;
        const ratio = length > 0 ? padding / length : 0;
        const adjustedSourceX = sourcePos.x + dx * ratio;
        const adjustedSourceY = sourcePos.y + dy * ratio;
        const adjustedTargetX = targetPos.x - dx * ratio;
        const adjustedTargetY = targetPos.y - dy * ratio;

        return (
          <g key={connection.id}>
            <line
              x1={adjustedSourceX}
              y1={adjustedSourceY}
              x2={adjustedTargetX}
              y2={adjustedTargetY}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="6 4"
              markerEnd="url(#arrowhead)"
              className="animate-fade-in"
            />
            {/* Distance label */}
            <text
              x={(adjustedSourceX + adjustedTargetX) / 2}
              y={(adjustedSourceY + adjustedTargetY) / 2 - 8}
              fill="hsl(var(--primary))"
              fontSize={12}
              textAnchor="middle"
              className="font-medium"
            >
              {Math.round(length / 50)}d
            </text>
          </g>
        );
      })}
    </svg>
  );
}
