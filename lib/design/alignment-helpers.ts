/**
 * Alignment Guides & Snapping Helpers
 * Detects alignment opportunities and calculates guide lines
 * Based on Figma/Sketch alignment behavior
 */

import type { FabricObject } from 'fabric';

// ============================================================================
// TYPES
// ============================================================================

export interface AlignmentLine {
  type: 'vertical' | 'horizontal';
  position: number; // X for vertical, Y for horizontal
  start: number; // Y for vertical, X for horizontal
  end: number; // Y for vertical, X for horizontal
}

export interface AlignmentResult {
  lines: AlignmentLine[];
  snapX: number | null; // Snap position for X axis
  snapY: number | null; // Snap position for Y axis
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SNAP_THRESHOLD = 10; // pixels

// ============================================================================
// CORE DETECTION LOGIC
// ============================================================================

/**
 * Get object bounds (including transformations)
 */
function getObjectBounds(obj: FabricObject) {
  const boundingRect = obj.getBoundingRect();

  // Use Fabric's getCenterPoint() for accurate center calculation
  const center = obj.getCenterPoint();

  return {
    left: boundingRect.left,
    top: boundingRect.top,
    right: boundingRect.left + boundingRect.width,
    bottom: boundingRect.top + boundingRect.height,
    centerX: center.x,  // Use Fabric's calculated center
    centerY: center.y,  // Use Fabric's calculated center
    width: boundingRect.width,
    height: boundingRect.height
  };
}

/**
 * Check if two values are within snap threshold
 */
function isNearby(val1: number, val2: number, threshold = SNAP_THRESHOLD): boolean {
  return Math.abs(val1 - val2) <= threshold;
}

/**
 * Detect alignment opportunities for a moving object
 * @param movingObject - The object being dragged
 * @param otherObjects - All other objects on canvas
 * @param canvasWidth - Canvas width for center alignment
 * @param canvasHeight - Canvas height for center alignment
 */
export function detectAlignments(
  movingObject: FabricObject,
  otherObjects: FabricObject[],
  canvasWidth: number,
  canvasHeight: number
): AlignmentResult {
  const lines: AlignmentLine[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  const movingBounds = getObjectBounds(movingObject);

  // Canvas center alignment
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  // Check canvas center alignment
  if (isNearby(movingBounds.centerX, canvasCenterX)) {
    snapX = canvasCenterX;
    lines.push({
      type: 'vertical',
      position: canvasCenterX,
      start: 0,
      end: canvasHeight
    });
  }

  if (isNearby(movingBounds.centerY, canvasCenterY)) {
    snapY = canvasCenterY;
    lines.push({
      type: 'horizontal',
      position: canvasCenterY,
      start: 0,
      end: canvasWidth
    });
  }

  // Check alignment with other objects
  for (const otherObj of otherObjects) {
    if (otherObj === movingObject) continue;

    const otherBounds = getObjectBounds(otherObj);

    // Vertical alignments (X axis)
    // Left edges align
    if (isNearby(movingBounds.left, otherBounds.left)) {
      if (snapX === null) {
        // Calculate center position that aligns left edges
        const shiftX = otherBounds.left - movingBounds.left;
        snapX = movingBounds.centerX + shiftX;
      }
      lines.push({
        type: 'vertical',
        position: otherBounds.left,
        start: Math.min(movingBounds.top, otherBounds.top),
        end: Math.max(movingBounds.bottom, otherBounds.bottom)
      });
    }

    // Center X align
    if (isNearby(movingBounds.centerX, otherBounds.centerX)) {
      if (snapX === null) {
        // Return target center X position directly
        snapX = otherBounds.centerX;
      }
      lines.push({
        type: 'vertical',
        position: otherBounds.centerX,
        start: Math.min(movingBounds.top, otherBounds.top),
        end: Math.max(movingBounds.bottom, otherBounds.bottom)
      });
    }

    // Right edges align
    if (isNearby(movingBounds.right, otherBounds.right)) {
      if (snapX === null) {
        // Calculate center position that aligns right edges
        const shiftX = otherBounds.right - movingBounds.right;
        snapX = movingBounds.centerX + shiftX;
      }
      lines.push({
        type: 'vertical',
        position: otherBounds.right,
        start: Math.min(movingBounds.top, otherBounds.top),
        end: Math.max(movingBounds.bottom, otherBounds.bottom)
      });
    }

    // Horizontal alignments (Y axis)
    // Top edges align
    if (isNearby(movingBounds.top, otherBounds.top)) {
      if (snapY === null) {
        // Calculate center position that aligns top edges
        const shiftY = otherBounds.top - movingBounds.top;
        snapY = movingBounds.centerY + shiftY;
      }
      lines.push({
        type: 'horizontal',
        position: otherBounds.top,
        start: Math.min(movingBounds.left, otherBounds.left),
        end: Math.max(movingBounds.right, otherBounds.right)
      });
    }

    // Center Y align
    if (isNearby(movingBounds.centerY, otherBounds.centerY)) {
      if (snapY === null) {
        // Return target center Y position directly
        snapY = otherBounds.centerY;
      }
      lines.push({
        type: 'horizontal',
        position: otherBounds.centerY,
        start: Math.min(movingBounds.left, otherBounds.left),
        end: Math.max(movingBounds.right, otherBounds.right)
      });
    }

    // Bottom edges align
    if (isNearby(movingBounds.bottom, otherBounds.bottom)) {
      if (snapY === null) {
        // Calculate center position that aligns bottom edges
        const shiftY = otherBounds.bottom - movingBounds.bottom;
        snapY = movingBounds.centerY + shiftY;
      }
      lines.push({
        type: 'horizontal',
        position: otherBounds.bottom,
        start: Math.min(movingBounds.left, otherBounds.left),
        end: Math.max(movingBounds.right, otherBounds.right)
      });
    }
  }

  return { lines, snapX, snapY };
}

/**
 * Remove duplicate alignment lines
 */
export function deduplicateLines(lines: AlignmentLine[]): AlignmentLine[] {
  const seen = new Set<string>();
  return lines.filter(line => {
    const key = `${line.type}-${line.position}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
