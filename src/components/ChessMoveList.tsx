import React, { useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// 1. DATA MODELS & TYPES
// ============================================================================

export type Color = 'w' | 'b';
export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface MoveNode {
  id: string;                      // Unique ID (e.g., 'm-1-e4', UUID, or ply hash)
  san: string;                     // Standard Algebraic Notation (e.g., "Nf3", "O-O", "exd5")
  piece?: PieceSymbol;             // Piece type ('p' | 'n' | 'b' | 'r' | 'q' | 'k')
  color: Color;                    // 'w' | 'b'
  ply: number;                     // 1-based ply (1 = 1. White, 2 = 1... Black, 3 = 2. White)
  moveNumber: number;              // Math.floor((ply + 1) / 2)
  fen: string;                     // Resulting FEN position
  parentId: string | null;         // Parent node id (null for root)
  children: MoveNode[];            // Variations at this junction (children[0] is mainline)
  activeChildIndex: number;        // Selected branch index when navigating forward (default: 0)
  nags?: string[];                 // Annotations e.g. ["!", "?", "+=", "!!"]
  comment?: string;                // Move commentary or tactical evaluation note
}

export interface MoveTree {
  rootId: string;
  initialFen: string;
  nodes: Record<string, MoveNode>; // Normalized dictionary for O(1) lookups
  startingMove: MoveNode | null;   // First node of the mainline (or null if empty)
}

export interface ChessMoveListProps {
  tree: MoveTree;
  activeNodeId: string | null;     // Currently selected node (null = starting position)
  onSelectMove: (node: MoveNode | null) => void;
  className?: string;
  maxHeight?: string | number;
  enableKeyboardNav?: boolean;
}

// ============================================================================
// 2. VECTOR SVG PIECE GLYPHS (NO EMOJIS, PURE VECTORS)
// ============================================================================

interface PieceGlyphProps {
  piece: PieceSymbol;
  color: Color;
  size?: number;
}

export const PieceGlyph: React.FC<PieceGlyphProps> = ({ piece, color, size = 13 }) => {
  const isWhite = color === 'w';
  const fillColor = isWhite ? '#ffffff' : '#222222';
  const strokeColor = isWhite ? '#1e293b' : '#0f172a';

  switch (piece.toLowerCase()) {
    case 'k':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 45 45"
          className="inline-block align-middle shrink-0 mr-0.5"
        >
          {/* Cross */}
          <path d="M22.5 6v5.5M20 8.5h5" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          {/* Base */}
          <path
            d="M12.5 36c0-1 1-2 2-3 2 1 5 1.5 8 1.5s6-.5 8-1.5c1 1 2 2 2 3H12.5z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          {/* Body */}
          <path
            d="M14.5 33c-2-2.5-3.5-6.5-1.5-11 2-4.5 9-4.5 9.5-1.5.5-3 7.5-3 9.5 1.5 2 4.5.5 8.5-1.5 11"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
      );
    case 'q':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 45 45"
          className="inline-block align-middle shrink-0 mr-0.5"
        >
          <path
            d="M9 26c8.5 8 18.5 8 27 0 1 3.5 2.5 6 2.5 8H6.5c0-2 1.5-4.5 2.5-8z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <path
            d="M9 26L11 14l5.5 8L22.5 12l6 10 5.5-8 2 12z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <circle cx="11" cy="13" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
          <circle cx="22.5" cy="11" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
          <circle cx="34" cy="13" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        </svg>
      );
    case 'r':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 45 45"
          className="inline-block align-middle shrink-0 mr-0.5"
        >
          <path
            d="M12 36h21v-4H12v4zm2-4l1-12h15l1 12H14zm-1-12h19v-6H13v6zm1-6v-4h4v3h4v-3h5v3h4v-3h4v4H14z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'b':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 45 45"
          className="inline-block align-middle shrink-0 mr-0.5"
        >
          <circle cx="22.5" cy="9.5" r="1.8" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
          <path
            d="M14 36h17v-4H14v4zm1-4c-1-4 2.5-8 4-11-1 0-2-2.5-.5-5 2-3 5-5 5-5s3 2 5 5c1.5 2.5.5 5-.5 5 1.5 3 5 7 4 11H15z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <path d="M20 18l5 6M25 18l-5 6" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'n':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 45 45"
          className="inline-block align-middle shrink-0 mr-0.5"
        >
          <path
            d="M22 10c5 0 10.5 3 10.5 3s-2.5 4-1.5 5c1 1 4 3.5 4 3.5s-4 1.5-5 2.5c-1 1-1.5 3.5-1.5 3.5s-.5 2.5 2.5 4c3 1.5 3 3.5 3 3.5H16.5c-4 0-5-4-5-4s1.5-5 0-9c-1.5-4-4-5-4-5s5-1 6-3c1-2 1-4 5-4z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="19" cy="15.5" r="1.2" fill={isWhite ? '#1e293b' : '#ffffff'} />
        </svg>
      );
    case 'p':
    default:
      return null; // Standard notation omits pawn symbol
  }
};

// Helper to determine piece from SAN if not explicitly given
export function extractPieceFromSan(san: string): PieceSymbol | undefined {
  if (san.startsWith('N')) return 'n';
  if (san.startsWith('B')) return 'b';
  if (san.startsWith('R')) return 'r';
  if (san.startsWith('Q')) return 'q';
  if (san.startsWith('K')) return 'k';
  if (san.startsWith('O-O')) return 'k';
  return 'p';
}

// Clean text SAN without leading piece character for rendered label
export function sanitizeSanText(san: string, piece?: PieceSymbol): string {
  if (san.startsWith('O-O')) return san;
  if (piece && piece !== 'p' && san.length > 1 && san[0] === piece.toUpperCase()) {
    return san.slice(1);
  }
  return san;
}

// ============================================================================
// 3. KEYBOARD NAVIGATION HOOK
// ============================================================================

export function useChessTreeNavigation({
  tree,
  activeNodeId,
  onSelectMove,
  enabled = true
}: {
  tree: MoveTree;
  activeNodeId: string | null;
  onSelectMove: (node: MoveNode | null) => void;
  enabled?: boolean;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore keystrokes inside input / textarea / contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const activeNode = activeNodeId ? tree.nodes[activeNodeId] : null;

      switch (e.key) {
        // ── Forward Navigation (Right Arrow) ──
        case 'ArrowRight': {
          e.preventDefault();
          if (!activeNode) {
            // At root / starting position: jump to initial move
            if (tree.startingMove) {
              onSelectMove(tree.startingMove);
            }
          } else {
            // Traverse down active child variation
            if (activeNode.children && activeNode.children.length > 0) {
              const activeIndex = activeNode.activeChildIndex || 0;
              const nextNode = activeNode.children[activeIndex] || activeNode.children[0];
              if (nextNode) {
                onSelectMove(nextNode);
              }
            }
          }
          break;
        }

        // ── Backward Navigation (Left Arrow) ──
        case 'ArrowLeft': {
          e.preventDefault();
          if (!activeNode) return; // Already at root

          if (activeNode.parentId) {
            const parentNode = tree.nodes[activeNode.parentId] || null;
            onSelectMove(parentNode);
          } else {
            // Return to starting position (null)
            onSelectMove(null);
          }
          break;
        }

        // ── Down Arrow: Cycle Alternative Variations Downwards ──
        case 'ArrowDown': {
          if (!activeNode) return;
          e.preventDefault();

          if (activeNode.parentId) {
            const parentNode = tree.nodes[activeNode.parentId];
            if (parentNode && parentNode.children.length > 1) {
              const currentIdx = parentNode.children.findIndex((c) => c.id === activeNode.id);
              if (currentIdx !== -1) {
                const nextIdx = (currentIdx + 1) % parentNode.children.length;
                parentNode.activeChildIndex = nextIdx;
                onSelectMove(parentNode.children[nextIdx]);
              }
            }
          }
          break;
        }

        // ── Up Arrow: Cycle Alternative Variations Upwards ──
        case 'ArrowUp': {
          if (!activeNode) return;
          e.preventDefault();

          if (activeNode.parentId) {
            const parentNode = tree.nodes[activeNode.parentId];
            if (parentNode && parentNode.children.length > 1) {
              const currentIdx = parentNode.children.findIndex((c) => c.id === activeNode.id);
              if (currentIdx !== -1) {
                const prevIdx = (currentIdx - 1 + parentNode.children.length) % parentNode.children.length;
                parentNode.activeChildIndex = prevIdx;
                onSelectMove(parentNode.children[prevIdx]);
              }
            }
          }
          break;
        }

        // ── Jump to Start (Home) ──
        case 'Home': {
          e.preventDefault();
          onSelectMove(null);
          break;
        }

        // ── Jump to End of Active Branch (End) ──
        case 'End': {
          e.preventDefault();
          let curr = activeNode || tree.startingMove;
          if (!curr) return;
          while (curr && curr.children && curr.children.length > 0) {
            const childIndex: number = curr.activeChildIndex ?? 0;
            curr = curr.children[childIndex] ?? curr.children[0] ?? null;
          }
          if (curr) onSelectMove(curr);
          break;
        }

        default:
          break;
      }
    },
    [enabled, activeNodeId, tree, onSelectMove]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ============================================================================
// 4. INDIVIDUAL MOVE TOKEN COMPONENT
// ============================================================================

interface MoveTokenProps {
  node: MoveNode;
  isActive: boolean;
  onSelect: (node: MoveNode) => void;
  showMoveNumber?: boolean;
  activeRef?: React.RefObject<HTMLButtonElement | null>;
}

export const MoveToken: React.FC<MoveTokenProps> = ({
  node,
  isActive,
  onSelect,
  showMoveNumber = false,
  activeRef
}) => {
  const piece = node.piece || extractPieceFromSan(node.san);
  const textSan = sanitizeSanText(node.san, piece);

  return (
    <button
      ref={isActive ? activeRef : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
      type="button"
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-xs transition-all duration-100 cursor-pointer select-none ${
        isActive
          ? 'bg-[#0085ff] text-white font-black shadow-xs ring-2 ring-sky-300/40 z-10'
          : 'text-slate-800 hover:bg-slate-200/70 hover:text-slate-950 font-semibold'
      }`}
      data-active={isActive}
      title={`FEN: ${node.fen}`}
    >
      {/* Number Prefix (e.g. "1." or "1...") */}
      {showMoveNumber && (
        <span
          className={`mr-0.5 text-[11px] font-bold ${
            isActive ? 'text-white/80' : 'text-slate-400'
          }`}
        >
          {node.moveNumber}
          {node.color === 'w' ? '.' : '...'}
        </span>
      )}

      {/* Piece SVG Icon */}
      {piece && piece !== 'p' && (
        <PieceGlyph piece={piece} color={node.color} size={12} />
      )}

      {/* SAN Text (e.g., "f3", "e4", "O-O") */}
      <span>{textSan}</span>

      {/* NAGs annotations (e.g., "!", "?", "+=") */}
      {node.nags && node.nags.length > 0 && (
        <span
          className={`ml-0.5 font-sans text-[10px] font-bold ${
            isActive ? 'text-amber-200' : 'text-blue-600'
          }`}
        >
          {node.nags.join('')}
        </span>
      )}
    </button>
  );
};

// ============================================================================
// 5. RECURSIVE VARIATION BLOCK COMPONENT
// ============================================================================

interface VariationBlockProps {
  startNode: MoveNode;
  activeNodeId: string | null;
  onSelect: (node: MoveNode) => void;
  depth: number;
  activeRef: React.RefObject<HTMLButtonElement | null>;
}

export const VariationBlock: React.FC<VariationBlockProps> = ({
  startNode,
  activeNodeId,
  onSelect,
  depth,
  activeRef
}) => {
  // Collect the moves along this variation line
  const sequence = useMemo(() => {
    const list: MoveNode[] = [];
    let curr: MoveNode | null = startNode;
    while (curr) {
      list.push(curr);
      // Follow the active variation child if defined, else default first child
      if (curr.children && curr.children.length > 0) {
        const nextIdx: number = curr.activeChildIndex ?? 0;
        curr = curr.children[nextIdx] ?? curr.children[0] ?? null;
      } else {
        curr = null;
      }
    }
    return list;
  }, [startNode]);

  // Subtle styling variations based on nesting depth
  const depthBg =
    depth === 1
      ? 'bg-slate-100/90 border-slate-200/80 text-slate-700'
      : depth === 2
      ? 'bg-slate-200/50 border-slate-300/60 text-slate-600'
      : 'bg-slate-200/80 border-slate-400/50 text-slate-600';

  return (
    <div
      className={`my-1 p-1.5 rounded-lg border-l-2 text-xs font-mono inline-block w-full transition-colors ${depthBg}`}
      style={{ paddingLeft: `${Math.min(depth * 8 + 6, 28)}px` }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 select-none">
        var ({depth}):
      </span>

      {sequence.map((node, idx) => {
        const isActive = activeNodeId === node.id;
        const showNumber = idx === 0 || node.color === 'w';

        // Check if this node has branching sub-variations (alternatives)
        const subVariations = node.children && node.children.length > 1 ? node.children.slice(1) : [];

        return (
          <React.Fragment key={node.id}>
            <MoveToken
              node={node}
              isActive={isActive}
              onSelect={onSelect}
              showMoveNumber={showNumber}
              activeRef={activeRef}
            />
            {' '}

            {/* Optional commentary note on variation move */}
            {node.comment && (
              <span className="text-[11px] font-sans italic text-slate-500 mx-1">
                "{node.comment}"
              </span>
            )}

            {/* Subvariations branching from this node */}
            {subVariations.length > 0 && (
              <div className="w-full pl-2 my-1">
                {subVariations.map((subVar) => (
                  <VariationBlock
                    key={subVar.id}
                    startNode={subVar}
                    activeNodeId={activeNodeId}
                    onSelect={onSelect}
                    depth={depth + 1}
                    activeRef={activeRef}
                  />
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ============================================================================
// 6. MAIN CHESS MOVE LIST COMPONENT
// ============================================================================

export const ChessMoveList: React.FC<ChessMoveListProps> = ({
  tree,
  activeNodeId,
  onSelectMove,
  className = '',
  maxHeight = '320px',
  enableKeyboardNav = true
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Hook up full keyboard arrows & shortcuts
  useChessTreeNavigation({
    tree,
    activeNodeId,
    onSelectMove,
    enabled: enableKeyboardNav
  });

  // Smooth scroll active move into visible viewport whenever activeNode changes
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [activeNodeId]);

  // Linearize the mainline from starting move
  const mainlineMoves = useMemo(() => {
    const list: MoveNode[] = [];
    let curr: MoveNode | null = tree.startingMove;
    while (curr) {
      list.push(curr);
      if (curr.children && curr.children.length > 0) {
        curr = curr.children[0]; // Mainline is always children[0]
      } else {
        curr = null;
      }
    }
    return list;
  }, [tree]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Chess Move Notation"
      className={`relative w-full rounded-2xl bg-white border border-slate-200 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500/30 overflow-y-auto custom-scrollbar p-3 text-sm select-none ${className}`}
      style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
    >
      {/* Starting Position Button (Move 0) */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <button
          onClick={() => onSelectMove(null)}
          type="button"
          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeNodeId === null
              ? 'bg-[#0085ff] text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          <span>Starting Position</span>
        </button>

        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
          {mainlineMoves.length} plies
        </span>
      </div>

      {/* Main Notation Stream */}
      <div className="leading-relaxed space-y-1">
        {mainlineMoves.map((node) => {
          const isActive = activeNodeId === node.id;
          const showNumber = node.color === 'w';

          // Collect any alternative branches (variations) departing from this move's parent
          const parentNode = node.parentId ? tree.nodes[node.parentId] : null;
          const siblingVariations =
            parentNode && parentNode.children.length > 1
              ? parentNode.children.filter((c) => c.id !== node.id)
              : [];

          return (
            <React.Fragment key={node.id}>
              {/* White move number prefix */}
              {showNumber && (
                <span className="inline-block w-6 text-right font-mono font-bold text-slate-400 text-xs mr-1 select-none">
                  {node.moveNumber}.
                </span>
              )}

              {/* Move Token Button */}
              <MoveToken
                node={node}
                isActive={isActive}
                onSelect={onSelectMove}
                showMoveNumber={!showNumber && node.parentId === null}
                activeRef={activeRef}
              />
              {' '}

              {/* Move Commentary */}
              {node.comment && (
                <span className="text-xs font-sans text-slate-500 italic mx-1.5 block py-0.5 pl-3 border-l-2 border-slate-200 my-0.5">
                  {node.comment}
                </span>
              )}

              {/* Sibling Variations (e.g., 1. e4 with (1. d4) alternative) */}
              {siblingVariations.length > 0 && (
                <div className="w-full my-1.5">
                  {siblingVariations.map((altNode) => (
                    <VariationBlock
                      key={altNode.id}
                      startNode={altNode}
                      activeNodeId={activeNodeId}
                      onSelect={onSelectMove}
                      depth={1}
                      activeRef={activeRef}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ChessMoveList;
