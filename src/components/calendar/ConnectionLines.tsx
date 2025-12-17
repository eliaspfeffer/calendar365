import { useEffect, useState } from 'react';
import { StickyNote, NoteConnection } from '@/types/calendar';

interface ConnectionLinesProps {
  connections: NoteConnection[];
  notes: StickyNote[];
  hoveredNoteId: string | null;
  scale: number;
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
  scale,
  containerRef,
}: ConnectionLinesProps) {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;

      const newPositions = new Map<string, Position>();
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      notes.forEach((note) => {
        const noteElement = container.querySelector(`[data-note-id="${note.id}"]`);
        if (noteElement) {
          const rect = noteElement.getBoundingClientRect();
          // Calculate position relative to the scrollable container
          newPositions.set(note.id, {
            x: (rect.left - containerRect.left + rect.width / 2) / scale,
            y: (rect.top - containerRect.top + rect.height / 2) / scale,
          });
        }
      });

      setPositions(newPositions);
    };

    updatePositions();

    // Update on scroll or resize
    const handleUpdate = () => {
      requestAnimationFrame(updatePositions);
    };

    window.addEventListener('resize', handleUpdate);
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleUpdate);
    }

    // Use MutationObserver to detect DOM changes
    const observer = new MutationObserver(handleUpdate);
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', handleUpdate);
      if (container) {
        container.removeEventListener('scroll', handleUpdate);
      }
      observer.disconnect();
    };
  }, [notes, scale, containerRef]);

  // Filter connections to show only those related to hovered note
  const visibleConnections = hoveredNoteId
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

        // Calculate the angle for the arrow
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Shorten line to not overlap with notes
        const padding = 20;
        const ratio = padding / length;
        const adjustedSourceX = sourcePos.x + dx * ratio;
        const adjustedSourceY = sourcePos.y + dy * ratio;
        const adjustedTargetX = targetPos.x - dx * ratio;
        const adjustedTargetY = targetPos.y - dy * ratio;

        return (
          <g key={connection.id}>
            <line
              x1={adjustedSourceX * scale}
              y1={adjustedSourceY * scale}
              x2={adjustedTargetX * scale}
              y2={adjustedTargetY * scale}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="6 4"
              markerEnd="url(#arrowhead)"
              className="animate-fade-in"
            />
            {/* Distance label */}
            <text
              x={((adjustedSourceX + adjustedTargetX) / 2) * scale}
              y={((adjustedSourceY + adjustedTargetY) / 2) * scale - 8}
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
