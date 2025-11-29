import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useProjectStore } from '@/features/project';
import { CharacterProfile } from '@/types';

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  character: CharacterProfile;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  dynamic: string;
}

interface KnowledgeGraphProps {
  onSelectCharacter: (character: CharacterProfile) => void;
}

const COLORS = [
  'var(--magic-400)',
  'var(--success-400)',
  'var(--warning-400)',
  'var(--error-400)',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ onSelectCharacter }) => {
  const { currentProject, chapters } = useProjectStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const dragRef = useRef<{ node: GraphNode | null; offsetX: number; offsetY: number }>({
    node: null,
    offsetX: 0,
    offsetY: 0,
  });

  // Collect all characters from lore and analysis
  const getAllCharacters = useCallback((): CharacterProfile[] => {
    const characterMap = new Map<string, CharacterProfile>();

    // From project lore
    currentProject?.lore?.characters?.forEach((char) => {
      characterMap.set(char.name.toLowerCase(), char);
    });

    // From chapter analyses
    chapters.forEach((chapter) => {
      chapter.lastAnalysis?.characters?.forEach((char) => {
        const key = char.name.toLowerCase();
        if (!characterMap.has(key)) {
          characterMap.set(key, char);
        }
      });
    });

    return Array.from(characterMap.values());
  }, [currentProject, chapters]);

  // Initialize graph data
  useEffect(() => {
    const characters = getAllCharacters();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Create nodes
    nodesRef.current = characters.map((char, i) => ({
      id: char.name.toLowerCase(),
      name: char.name,
      x: centerX + (Math.random() - 0.5) * 300,
      y: centerY + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      radius: Math.min(30, 20 + (char.relationships?.length || 0) * 3),
      color: COLORS[i % COLORS.length],
      character: char,
    }));

    // Create links from relationships
    const links: GraphLink[] = [];
    characters.forEach((char) => {
      char.relationships?.forEach((rel) => {
        const targetId = rel.name.toLowerCase();
        if (nodesRef.current.find((n) => n.id === targetId)) {
          // Avoid duplicate links
          const existing = links.find(
            (l) =>
              (l.source === char.name.toLowerCase() && l.target === targetId) ||
              (l.source === targetId && l.target === char.name.toLowerCase())
          );
          if (!existing) {
            links.push({
              source: char.name.toLowerCase(),
              target: targetId,
              type: rel.type,
              dynamic: rel.dynamic,
            });
          }
        }
      });
    });
    linksRef.current = links;
  }, [getAllCharacters, dimensions]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Force simulation
  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Apply forces
    nodes.forEach((node) => {
      // Center gravity
      node.vx += (centerX - node.x) * 0.001;
      node.vy += (centerY - node.y) * 0.001;

      // Repulsion from other nodes
      nodes.forEach((other) => {
        if (other.id !== node.id) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = node.radius + other.radius + 80;

          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.5;
            node.vx += dx * force;
            node.vy += dy * force;
          }
        }
      });
    });

    // Link attraction
    links.forEach((link) => {
      const source = nodes.find((n) => n.id === link.source);
      const target = nodes.find((n) => n.id === link.target);
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 150;
        const force = (dist - idealDist) / dist * 0.02;

        source.vx += dx * force;
        source.vy += dy * force;
        target.vx -= dx * force;
        target.vy -= dy * force;
      }
    });

    // Update positions with damping
    nodes.forEach((node) => {
      if (dragRef.current.node?.id !== node.id) {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;

        // Boundary constraints
        const padding = 60;
        node.x = Math.max(padding, Math.min(dimensions.width - padding, node.x));
        node.y = Math.max(padding, Math.min(dimensions.height - padding, node.y));
      }
    });
  }, [dimensions]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      simulate();

      // Clear
      ctx.fillStyle = 'rgba(252, 250, 245, 1)'; // parchment-50 equivalent
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw links
      linksRef.current.forEach((link) => {
        const source = nodesRef.current.find((n) => n.id === link.source);
        const target = nodesRef.current.find((n) => n.id === link.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id)
            ? 'rgba(139, 92, 246, 0.6)'
            : 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id) ? 2 : 1;
          ctx.stroke();

          // Draw relationship type label
          if (hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id)) {
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            ctx.font = '10px sans-serif';
            ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
            ctx.textAlign = 'center';
            ctx.fillText(link.type, midX, midY - 4);
          }
        }
      });

      // Draw nodes
      nodesRef.current.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (isHovered ? 4 : 0), 0, Math.PI * 2);
        
        // Create gradient
        const gradient = ctx.createRadialGradient(
          node.x - node.radius * 0.3,
          node.y - node.radius * 0.3,
          0,
          node.x,
          node.y,
          node.radius
        );
        gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(1, node.color);
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // Border
        if (isSelected || isHovered) {
          ctx.strokeStyle = isSelected ? '#1a1a1a' : 'rgba(0,0,0,0.3)';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();
        }

        // Name label
        ctx.font = `${isHovered ? 'bold ' : ''}12px "Crimson Pro", serif`;
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Truncate name if needed
        const maxWidth = node.radius * 1.8;
        let displayName = node.name;
        if (ctx.measureText(displayName).width > maxWidth) {
          while (ctx.measureText(displayName + '...').width > maxWidth && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '...';
        }
        
        ctx.fillText(displayName, node.x, node.y + node.radius + 16);
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, simulate, hoveredNode, selectedNode]);

  // Mouse interactions
  const getNodeAtPosition = (x: number, y: number): GraphNode | null => {
    for (const node of nodesRef.current) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius) {
        return node;
      }
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle dragging
    if (dragRef.current.node) {
      dragRef.current.node.x = x - dragRef.current.offsetX;
      dragRef.current.node.y = y - dragRef.current.offsetY;
      dragRef.current.node.vx = 0;
      dragRef.current.node.vy = 0;
      return;
    }

    const node = getNodeAtPosition(x, y);
    setHoveredNode(node);
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? 'pointer' : 'default';
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAtPosition(x, y);

    if (node) {
      dragRef.current = {
        node,
        offsetX: x - node.x,
        offsetY: y - node.y,
      };
    }
  };

  const handleMouseUp = () => {
    if (dragRef.current.node) {
      dragRef.current = { node: null, offsetX: 0, offsetY: 0 };
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAtPosition(x, y);

    if (node) {
      setSelectedNode(node);
      onSelectCharacter(node.character);
    } else {
      setSelectedNode(null);
    }
  };

  const characters = getAllCharacters();

  if (characters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--parchment-200)] flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--ink-400)]">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <h3 className="font-serif text-lg font-semibold text-[var(--ink-700)] mb-2">
          No Characters Found
        </h3>
        <p className="text-sm text-[var(--ink-500)] max-w-xs">
          Run analysis on your chapters or add characters to the Lore Bible to see them visualized here.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full relative overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        className="block"
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[var(--parchment-50)] rounded-lg border border-[var(--ink-100)] p-3 shadow-sm">
        <div className="text-xs font-semibold text-[var(--ink-600)] mb-2">Characters</div>
        <div className="space-y-1">
          {nodesRef.current.slice(0, 5).map((node) => (
            <div key={node.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: node.color }}
              />
              <span className="text-xs text-[var(--ink-600)]">{node.name}</span>
            </div>
          ))}
          {nodesRef.current.length > 5 && (
            <div className="text-xs text-[var(--ink-400)]">
              +{nodesRef.current.length - 5} more
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 text-xs text-[var(--ink-400)]">
        Click a node to view details • Drag to reposition
      </div>
    </div>
  );
};
