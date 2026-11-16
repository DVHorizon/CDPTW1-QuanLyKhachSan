/**
 * draggableUtils.js
 * Pure mathematical functions for coordinate clamping, viewport boundaries,
 * resize readjustment, and state transition anchoring for draggable UI components.
 */

export const DEFAULT_MARGIN = 16;
export const DRAG_THRESHOLD = 5;

/**
 * Clamps a single coordinate value between min and max bounds.
 * If min > max (e.g. element larger than viewport space), bounds gracefully to min.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampCoordinate(value, min, max) {
  if (min > max) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * Computes clamped coordinates { x, y } keeping an element fully inside viewport boundaries.
 * Supports both signatures:
 *   1) clampPosition(x, y, elemWidth, elemHeight, vpWidth, vpHeight, margin)
 *   2) clampPosition({ x, y }, { width, height }, { width: vpW, height: vpH }, margin)
 *
 * @returns {{ x: number, y: number }}
 */
export function clampPosition(
  xOrPos,
  yOrElemSize,
  elemWidthOrVpSize,
  elemHeightOrMargin,
  vpWidth,
  vpHeight,
  margin = DEFAULT_MARGIN
) {
  let x = 0;
  let y = 0;
  let elemWidth = 0;
  let elemHeight = 0;
  let vpW = typeof window !== 'undefined' ? window.innerWidth : 1024;
  let vpH = typeof window !== 'undefined' ? window.innerHeight : 768;
  let m = DEFAULT_MARGIN;

  if (typeof xOrPos === 'object' && xOrPos !== null) {
    // Signature: clampPosition({ x, y }, { width, height }, { width: vpW, height: vpH }, margin)
    x = Number(xOrPos.x) || 0;
    y = Number(xOrPos.y) || 0;

    if (typeof yOrElemSize === 'object' && yOrElemSize !== null) {
      elemWidth = Number(yOrElemSize.width) || 0;
      elemHeight = Number(yOrElemSize.height) || 0;
    }

    if (typeof elemWidthOrVpSize === 'object' && elemWidthOrVpSize !== null) {
      vpW = Number(elemWidthOrVpSize.width) || vpW;
      vpH = Number(elemWidthOrVpSize.height) || vpH;
    } else if (typeof elemWidthOrVpSize === 'number') {
      vpW = elemWidthOrVpSize;
    }

    if (typeof elemHeightOrMargin === 'number') {
      m = elemHeightOrMargin;
    }
  } else {
    // Signature: clampPosition(x, y, elemWidth, elemHeight, vpWidth, vpHeight, margin)
    x = Number(xOrPos) || 0;
    y = Number(yOrElemSize) || 0;
    elemWidth = Number(elemWidthOrVpSize) || 0;
    elemHeight = Number(elemHeightOrMargin) || 0;
    vpW = typeof vpWidth === 'number' ? vpWidth : vpW;
    vpH = typeof vpHeight === 'number' ? vpHeight : vpH;
    m = typeof margin === 'number' ? margin : DEFAULT_MARGIN;
  }

  const minX = m;
  const maxX = Math.max(m, vpW - elemWidth - m);

  const minY = m;
  const maxY = Math.max(m, vpH - elemHeight - m);

  return {
    x: clampCoordinate(x, minX, maxX),
    y: clampCoordinate(y, minY, maxY),
  };
}

/**
 * Checks if movement exceeds the drag threshold (default 5px).
 * Supports both signatures:
 *   1) isExceedingThreshold(dx, dy, threshold)
 *   2) isExceedingThreshold({ x: startX, y: startY }, { x: endX, y: endY }, threshold)
 *
 * @returns {boolean}
 */
export function isExceedingThreshold(dxOrStart, dyOrEnd, threshold = DRAG_THRESHOLD) {
  let dx = 0;
  let dy = 0;
  let th = threshold;

  if (
    typeof dxOrStart === 'object' &&
    dxOrStart !== null &&
    typeof dyOrEnd === 'object' &&
    dyOrEnd !== null
  ) {
    dx = (dyOrEnd.x ?? 0) - (dxOrStart.x ?? 0);
    dy = (dyOrEnd.y ?? 0) - (dxOrStart.y ?? 0);
  } else {
    dx = Number(dxOrStart) || 0;
    dy = Number(dyOrEnd) || 0;
  }

  return Math.hypot(dx, dy) >= th;
}

/**
 * Alias for isExceedingThreshold matching testing specification names.
 */
export const isDragThresholdExceeded = (startPoint, currentPoint, threshold = DRAG_THRESHOLD) =>
  isExceedingThreshold(startPoint, currentPoint, threshold);

/**
 * Re-clamps a coordinate when the viewport dimensions change on window resize.
 *
 * @param {{ x: number, y: number } | null} currentPosition
 * @param {{ width: number, height: number }} elementSize
 * @param {{ width: number, height: number }} newViewportSize
 * @param {number} margin
 * @returns {{ x: number, y: number } | null}
 */
export function recalculatePositionOnResize(
  currentPosition,
  elementSize,
  newViewportSize,
  margin = DEFAULT_MARGIN
) {
  if (!currentPosition) return null;
  return clampPosition(currentPosition, elementSize, newViewportSize, margin);
}

/**
 * Computes anchor-preserved position when transitioning from collapsed bubble to expanded chat window.
 * Expands upward and leftward when situated in the bottom/right quadrants to stay within viewport.
 *
 * @param {{ left: number, top: number, right: number, bottom: number, width: number, height: number }} bubbleRect
 * @param {number} expandedWidth
 * @param {number} expandedHeight
 * @param {number} vpWidth
 * @param {number} vpHeight
 * @param {number} margin
 * @returns {{ x: number, y: number }}
 */
export function computeExpandedPosition(
  bubbleRect,
  expandedWidth,
  expandedHeight,
  vpWidth,
  vpHeight,
  margin = DEFAULT_MARGIN
) {
  const bLeft = bubbleRect?.left ?? 0;
  const bTop = bubbleRect?.top ?? 0;
  const bWidth = bubbleRect?.width ?? 0;
  const bHeight = bubbleRect?.height ?? 0;
  const bRight = bubbleRect?.right ?? bLeft + bWidth;
  const bBottom = bubbleRect?.bottom ?? bTop + bHeight;

  const bubbleCenterX = bLeft + bWidth / 2;
  const bubbleCenterY = bTop + bHeight / 2;

  let targetX = bLeft;
  let targetY = bTop;

  // If bubble is on the right half, align right edge of window to bubble's right edge
  if (bubbleCenterX > vpWidth / 2) {
    targetX = bRight - expandedWidth;
  }

  // If bubble is on the bottom half, expand upwards
  if (bubbleCenterY > vpHeight / 2) {
    targetY = bBottom - expandedHeight;
  }

  return clampPosition(targetX, targetY, expandedWidth, expandedHeight, vpWidth, vpHeight, margin);
}

/**
 * Computes anchor-preserved position when transitioning from expanded window back to collapsed bubble.
 *
 * @param {{ left: number, top: number, right: number, bottom: number, width: number, height: number }} windowRect
 * @param {number} bubbleWidth
 * @param {number} bubbleHeight
 * @param {number} vpWidth
 * @param {number} vpHeight
 * @param {number} margin
 * @returns {{ x: number, y: number }}
 */
export function computeCollapsedPosition(
  windowRect,
  bubbleWidth,
  bubbleHeight,
  vpWidth,
  vpHeight,
  margin = DEFAULT_MARGIN
) {
  const wLeft = windowRect?.left ?? 0;
  const wTop = windowRect?.top ?? 0;
  const wWidth = windowRect?.width ?? 0;
  const wHeight = windowRect?.height ?? 0;
  const wRight = windowRect?.right ?? wLeft + wWidth;
  const wBottom = windowRect?.bottom ?? wTop + wHeight;

  const windowCenterX = wLeft + wWidth / 2;
  const windowCenterY = wTop + wHeight / 2;

  let targetX = wLeft;
  let targetY = wTop;

  if (windowCenterX > vpWidth / 2) {
    targetX = wRight - bubbleWidth;
  }

  if (windowCenterY > vpHeight / 2) {
    targetY = wBottom - bubbleHeight;
  }

  return clampPosition(targetX, targetY, bubbleWidth, bubbleHeight, vpWidth, vpHeight, margin);
}
