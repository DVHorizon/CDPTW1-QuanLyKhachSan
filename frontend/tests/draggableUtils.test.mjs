/**
 * draggableUtils.test.mjs
 * Comprehensive unit tests for draggable mathematical utilities.
 * Run with Node.js native test runner: node --test frontend/tests/draggableUtils.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampCoordinate,
  clampPosition,
  isExceedingThreshold,
  isDragThresholdExceeded,
  recalculatePositionOnResize,
  computeExpandedPosition,
  computeCollapsedPosition,
  DEFAULT_MARGIN,
  DRAG_THRESHOLD,
} from '../src/utils/draggableUtils.js';

test('DEFAULT_MARGIN and DRAG_THRESHOLD constants', () => {
  assert.equal(DEFAULT_MARGIN, 16);
  assert.equal(DRAG_THRESHOLD, 5);
});

test('clampCoordinate: restricts value within [min, max]', () => {
  // Inside bounds
  assert.equal(clampCoordinate(50, 10, 100), 50);
  // Below min
  assert.equal(clampCoordinate(5, 10, 100), 10);
  assert.equal(clampCoordinate(-20, 0, 50), 0);
  // Above max
  assert.equal(clampCoordinate(150, 10, 100), 100);
  assert.equal(clampCoordinate(1000, 0, 800), 800);
  // Exact boundaries
  assert.equal(clampCoordinate(10, 10, 100), 10);
  assert.equal(clampCoordinate(100, 10, 100), 100);
  // Edge case: min > max (compact screen)
  assert.equal(clampCoordinate(50, 100, 20), 100);
});

test('clampPosition: TC-CLAMP-01 Position within viewport remains unchanged', () => {
  const result = clampPosition(200, 300, 300, 400, 1200, 800, 16);
  assert.deepEqual(result, { x: 200, y: 300 });

  // Object-based signature
  const objResult = clampPosition(
    { x: 200, y: 300 },
    { width: 300, height: 400 },
    { width: 1200, height: 800 },
    16
  );
  assert.deepEqual(objResult, { x: 200, y: 300 });
});

test('clampPosition: TC-CLAMP-02 Left boundary violation clamped to margin', () => {
  const result = clampPosition(-50, 200, 300, 400, 1200, 800, 16);
  assert.equal(result.x, 16);
  assert.equal(result.y, 200);

  // Severe negative violation
  const severe = clampPosition(-9999, 200, 300, 400, 1200, 800, 16);
  assert.equal(severe.x, 16);
});

test('clampPosition: TC-CLAMP-03 Top boundary violation clamped to margin', () => {
  const result = clampPosition(200, -40, 300, 400, 1200, 800, 16);
  assert.equal(result.x, 200);
  assert.equal(result.y, 16);

  // Severe negative violation
  const severe = clampPosition(200, -5000, 300, 400, 1200, 800, 16);
  assert.equal(severe.y, 16);
});

test('clampPosition: TC-CLAMP-04 Right boundary violation clamped to vpWidth - elemWidth - margin', () => {
  // vpWidth: 1200, elemWidth: 300, margin: 16 -> maxX = 1200 - 300 - 16 = 884
  const result = clampPosition(1000, 200, 300, 400, 1200, 800, 16);
  assert.equal(result.x, 884);
  assert.equal(result.y, 200);

  const severe = clampPosition(5000, 200, 300, 400, 1200, 800, 16);
  assert.equal(severe.x, 884);
});

test('clampPosition: TC-CLAMP-05 Bottom boundary violation clamped to vpHeight - elemHeight - margin', () => {
  // vpHeight: 800, elemHeight: 400, margin: 16 -> maxY = 800 - 400 - 16 = 384
  const result = clampPosition(200, 700, 300, 400, 1200, 800, 16);
  assert.equal(result.x, 200);
  assert.equal(result.y, 384);
});

test('clampPosition: TC-CLAMP-06 Bottom-right dual violation clamped simultaneously', () => {
  const result = clampPosition(1500, 1200, 300, 500, 1000, 700, 16);
  // maxX = 1000 - 300 - 16 = 684
  // maxY = 700 - 500 - 16 = 184
  assert.equal(result.x, 684);
  assert.equal(result.y, 184);
});

test('clampPosition: TC-CLAMP-07 Narrow / mobile viewport edge case', () => {
  // Viewport width 360, element width 400 -> element wider than viewport!
  const result = clampPosition(50, 50, 400, 500, 360, 600, 16);
  // minX = 16, maxX = Math.max(16, 360 - 400 - 16) = Math.max(16, -56) = 16
  assert.equal(result.x, 16);
  assert.ok(result.x >= 16);
});

test('isExceedingThreshold / isDragThresholdExceeded: TC-THRESH-01 Sub-threshold (< 5px) is NOT a drag', () => {
  // (2, 2) -> hypot = ~2.83 < 5
  assert.equal(isExceedingThreshold(2, 2, 5), false);
  assert.equal(isExceedingThreshold(0, 4.9, 5), false);
  assert.equal(isExceedingThreshold(-3, 2, 5), false); // hypot = ~3.61 < 5

  // Object points
  assert.equal(isDragThresholdExceeded({ x: 100, y: 100 }, { x: 102, y: 103 }, 5), false);
});

test('isExceedingThreshold / isDragThresholdExceeded: TC-THRESH-02 Movement >= 5px IS a drag', () => {
  // Exact 3-4-5 right triangle -> hypot = 5.0
  assert.equal(isExceedingThreshold(3, 4, 5), true);
  assert.equal(isExceedingThreshold(4, 3, 5), true);
  assert.equal(isExceedingThreshold(0, 5, 5), true);
  assert.equal(isExceedingThreshold(5, 0, 5), true);
  assert.equal(isExceedingThreshold(50, 50, 5), true);

  // Object points
  assert.equal(isDragThresholdExceeded({ x: 100, y: 100 }, { x: 103, y: 104 }, 5), true);
});

test('isExceedingThreshold / isDragThresholdExceeded: TC-THRESH-03 Negative and diagonal threshold calculation', () => {
  // Negative directions
  assert.equal(isExceedingThreshold(-3, -4, 5), true);
  assert.equal(isExceedingThreshold(-10, 0, 5), true);
  assert.equal(isExceedingThreshold(0, -10, 5), true);

  // Object points with negative delta
  assert.equal(isDragThresholdExceeded({ x: 0, y: 0 }, { x: -10, y: -10 }, 5), true);
});

test('recalculatePositionOnResize: TC-RESIZE-01 and TC-RESIZE-02', () => {
  // Shrinking viewport pulls element inside
  const prevPos = { x: 800, y: 600 };
  const elemSize = { width: 200, height: 200 };
  const newVpSize = { width: 800, height: 600 };
  const margin = 16;

  // maxX = 800 - 200 - 16 = 584, maxY = 600 - 200 - 16 = 384
  const resized = recalculatePositionOnResize(prevPos, elemSize, newVpSize, margin);
  assert.deepEqual(resized, { x: 584, y: 384 });

  // Expanding viewport keeps position intact
  const growingVp = { width: 1920, height: 1080 };
  const keepPos = recalculatePositionOnResize({ x: 300, y: 300 }, elemSize, growingVp, margin);
  assert.deepEqual(keepPos, { x: 300, y: 300 });

  // Null position handling
  assert.equal(recalculatePositionOnResize(null, elemSize, newVpSize, margin), null);
});

test('computeExpandedPosition: expands upwards and leftwards when near bottom-right', () => {
  const bubbleRect = {
    left: 1650,
    top: 1000,
    right: 1880,
    bottom: 1056,
    width: 230,
    height: 56,
  };
  const expandedWidth = 410;
  const expandedHeight = 540;
  const vpWidth = 1920;
  const vpHeight = 1080;
  const margin = 16;

  const pos = computeExpandedPosition(
    bubbleRect,
    expandedWidth,
    expandedHeight,
    vpWidth,
    vpHeight,
    margin
  );

  // Must be clamped inside viewport
  assert.ok(pos.x >= margin, `pos.x ${pos.x} should be >= ${margin}`);
  assert.ok(pos.y >= margin, `pos.y ${pos.y} should be >= ${margin}`);
  assert.ok(
    pos.x + expandedWidth <= vpWidth - margin,
    `pos.x + width ${pos.x + expandedWidth} should be <= ${vpWidth - margin}`
  );
  assert.ok(
    pos.y + expandedHeight <= vpHeight - margin,
    `pos.y + height ${pos.y + expandedHeight} should be <= ${vpHeight - margin}`
  );
});

test('computeExpandedPosition: expands downwards and rightwards when in top-left', () => {
  const bubbleRect = {
    left: 20,
    top: 20,
    right: 250,
    bottom: 76,
    width: 230,
    height: 56,
  };
  const expandedWidth = 410;
  const expandedHeight = 540;
  const vpWidth = 1920;
  const vpHeight = 1080;
  const margin = 16;

  const pos = computeExpandedPosition(
    bubbleRect,
    expandedWidth,
    expandedHeight,
    vpWidth,
    vpHeight,
    margin
  );

  assert.equal(pos.x, 20);
  assert.equal(pos.y, 20);
  assert.ok(pos.x + expandedWidth <= vpWidth - margin);
  assert.ok(pos.y + expandedHeight <= vpHeight - margin);
});

test('computeCollapsedPosition: collapses back with correct anchor', () => {
  const windowRect = {
    left: 1494,
    top: 524,
    right: 1904,
    bottom: 1064,
    width: 410,
    height: 540,
  };
  const bubbleWidth = 230;
  const bubbleHeight = 56;
  const vpWidth = 1920;
  const vpHeight = 1080;
  const margin = 16;

  const pos = computeCollapsedPosition(
    windowRect,
    bubbleWidth,
    bubbleHeight,
    vpWidth,
    vpHeight,
    margin
  );

  assert.ok(pos.x >= margin);
  assert.ok(pos.y >= margin);
  assert.ok(pos.x + bubbleWidth <= vpWidth - margin);
  assert.ok(pos.y + bubbleHeight <= vpHeight - margin);
});
