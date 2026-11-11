/**
 * draggableInteraction.test.mjs
 * Comprehensive tests for draggable pointer event interaction, click-vs-drag disambiguation,
 * child button exclusions, boundary clamping, and resize handling.
 * Run with: node --test frontend/tests/draggableInteraction.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPosition,
  isExceedingThreshold,
  computeExpandedPosition,
  computeCollapsedPosition,
} from '../src/utils/draggableUtils.js';

/**
 * Lightweight mock harness replicating the exact state machine and logic
 * implemented in useDraggable hook.
 */
function createDraggableHarness(options = {}) {
  const {
    margin = 16,
    dragThreshold = 5,
    disabled = false,
    initialPosition = null,
    vpWidth = 1920,
    vpHeight = 1080,
    elemRect = { left: 1650, top: 1000, width: 230, height: 56 },
  } = options;

  let position = initialPosition;
  let isDragging = false;
  let suppressClick = false;

  const dragInfo = {
    pointerId: null,
    startX: 0,
    startY: 0,
    initialElemX: 0,
    initialElemY: 0,
    hasMoved: false,
  };

  const currentRect = { ...elemRect };

  const handlePointerDown = (e, { isHandleCheck } = {}) => {
    if (disabled || (e.button !== undefined && e.button !== 0)) return;

    if (e.target && typeof e.target.closest === 'function') {
      const closestInteractive = e.target.closest(
        'button, input, textarea, a, select, [data-no-drag]'
      );
      if (closestInteractive && closestInteractive !== e.currentTarget) {
        return; // Exclude child buttons/inputs inside handle
      }
    }

    if (isHandleCheck && isHandleCheck(e)) {
      return;
    }

    const currentX = position ? position.x : currentRect.left;
    const currentY = position ? position.y : currentRect.top;

    dragInfo.pointerId = e.pointerId ?? 1;
    dragInfo.startX = e.clientX;
    dragInfo.startY = e.clientY;
    dragInfo.initialElemX = currentX;
    dragInfo.initialElemY = currentY;
    dragInfo.hasMoved = false;
  };

  const handlePointerMove = (e) => {
    if (dragInfo.pointerId === null || dragInfo.pointerId !== (e.pointerId ?? 1)) {
      return;
    }

    const dx = e.clientX - dragInfo.startX;
    const dy = e.clientY - dragInfo.startY;

    if (!dragInfo.hasMoved) {
      if (isExceedingThreshold(dx, dy, dragThreshold)) {
        dragInfo.hasMoved = true;
        isDragging = true;
      } else {
        return;
      }
    }

    const rawX = dragInfo.initialElemX + dx;
    const rawY = dragInfo.initialElemY + dy;

    position = clampPosition(
      rawX,
      rawY,
      currentRect.width,
      currentRect.height,
      vpWidth,
      vpHeight,
      margin
    );
  };

  const handlePointerUp = (e) => {
    if (dragInfo.pointerId === null || dragInfo.pointerId !== (e.pointerId ?? 1)) {
      return;
    }

    if (dragInfo.hasMoved) {
      suppressClick = true;
    }
    isDragging = false;
    dragInfo.pointerId = null;
    dragInfo.hasMoved = false;
  };

  const handleResize = (newVpWidth, newVpHeight) => {
    if (!position) return;
    position = clampPosition(
      position.x,
      position.y,
      currentRect.width,
      currentRect.height,
      newVpWidth,
      newVpHeight,
      margin
    );
  };

  return {
    getPosition: () => position,
    setPosition: (p) => {
      position = p;
    },
    isDragging: () => isDragging,
    isSuppressClick: () => suppressClick,
    resetSuppressClick: () => {
      suppressClick = false;
    },
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResize,
    getDragInfo: () => dragInfo,
  };
}

test('TC-INT-01: Micro-movement (< 5px) does not start dragging and preserves click', () => {
  const harness = createDraggableHarness();

  // Pointer down at (500, 500)
  harness.handlePointerDown({ clientX: 500, clientY: 500, button: 0 });
  assert.equal(harness.getDragInfo().pointerId, 1);
  assert.equal(harness.isDragging(), false);

  // Micro-movement: dx = 2, dy = 3 (Math.hypot(2, 3) = ~3.6px < 5px)
  harness.handlePointerMove({ clientX: 502, clientY: 503 });
  assert.equal(harness.isDragging(), false);
  assert.equal(harness.getPosition(), null); // Position not updated

  // Pointer up
  harness.handlePointerUp({});
  assert.equal(harness.isDragging(), false);
  assert.equal(harness.isSuppressClick(), false); // Click NOT suppressed!
});

test('TC-INT-02: Movement >= 5px enters dragging mode and updates position', () => {
  const harness = createDraggableHarness({
    elemRect: { left: 500, top: 500, width: 230, height: 56 },
  });

  harness.handlePointerDown({ clientX: 500, clientY: 500, button: 0 });

  // Move 50px right, 30px down (well exceeds 5px threshold)
  harness.handlePointerMove({ clientX: 550, clientY: 530 });
  assert.equal(harness.isDragging(), true);

  const pos = harness.getPosition();
  assert.ok(pos !== null);
  assert.equal(pos.x, 550);
  assert.equal(pos.y, 530);

  // Pointer up suppresses subsequent click event
  harness.handlePointerUp({});
  assert.equal(harness.isDragging(), false);
  assert.equal(harness.isSuppressClick(), true); // Accidental toggle prevented!
});

test('TC-INT-03: Header refresh button click is excluded from initiating drag', () => {
  const harness = createDraggableHarness();

  const refreshBtn = { tagName: 'BUTTON', title: 'Làm mới hội thoại' };
  const headerDiv = { tagName: 'DIV' };

  refreshBtn.closest = (selector) => {
    if (selector.includes('button')) return refreshBtn;
    return null;
  };

  // Pointer down directly on the refresh button inside the header
  harness.handlePointerDown({
    clientX: 100,
    clientY: 100,
    button: 0,
    target: refreshBtn,
    currentTarget: headerDiv,
  });

  // Drag must NOT initiate because target button !== currentTarget div
  assert.equal(harness.getDragInfo().pointerId, null);
  assert.equal(harness.isDragging(), false);
});

test('TC-INT-04: Header close button click is excluded from initiating drag', () => {
  const harness = createDraggableHarness();

  const closeBtn = { tagName: 'BUTTON', title: 'Thu gọn' };
  const headerDiv = { tagName: 'DIV' };

  closeBtn.closest = (selector) => {
    if (selector.includes('button')) return closeBtn;
    return null;
  };

  harness.handlePointerDown({
    clientX: 120,
    clientY: 100,
    button: 0,
    target: closeBtn,
    currentTarget: headerDiv,
  });

  assert.equal(harness.getDragInfo().pointerId, null);
  assert.equal(harness.isDragging(), false);
});

test('TC-INT-05: Non-handle child elements (e.g. text input) are excluded from initiating drag', () => {
  const harness = createDraggableHarness();

  const inputEl = { tagName: 'INPUT' };
  const headerDiv = { tagName: 'DIV' };

  inputEl.closest = (selector) => {
    if (selector.includes('input')) return inputEl;
    return null;
  };

  harness.handlePointerDown({
    clientX: 200,
    clientY: 200,
    button: 0,
    target: inputEl,
    currentTarget: headerDiv,
  });

  assert.equal(harness.getDragInfo().pointerId, null);
  assert.equal(harness.isDragging(), false);
});

test('TC-INT-06: Collapsed bubble button handle allows drag on itself and its label children', () => {
  const harness = createDraggableHarness();

  const bubbleBtn = { tagName: 'BUTTON' };
  const innerSpan = { tagName: 'SPAN', textContent: 'AI' };

  // Inner span's closest('button') returns bubbleBtn, which matches currentTarget!
  innerSpan.closest = (selector) => {
    if (selector.includes('button')) return bubbleBtn;
    return null;
  };

  harness.handlePointerDown({
    clientX: 500,
    clientY: 500,
    button: 0,
    target: innerSpan,
    currentTarget: bubbleBtn,
  });

  // Because closest button === currentTarget, drag initiates successfully!
  assert.equal(harness.getDragInfo().pointerId, 1);
});

test('TC-INT-07: Drag clamping prevents element from escaping screen edges on extreme movement', () => {
  const harness = createDraggableHarness({
    vpWidth: 1920,
    vpHeight: 1080,
    elemRect: { left: 500, top: 500, width: 410, height: 540 },
  });

  harness.handlePointerDown({ clientX: 500, clientY: 500, button: 0 });

  // Drag far beyond top-left (-2000, -2000)
  harness.handlePointerMove({ clientX: -2000, clientY: -2000 });
  const posTopLeft = harness.getPosition();
  assert.equal(posTopLeft.x, 16);
  assert.equal(posTopLeft.y, 16);

  // Drag far beyond bottom-right (+5000, +5000)
  harness.handlePointerMove({ clientX: 5000, clientY: 5000 });
  const posBottomRight = harness.getPosition();
  assert.equal(posBottomRight.x, 1920 - 410 - 16); // 1494
  assert.equal(posBottomRight.y, 1080 - 540 - 16); // 524
});

test('TC-INT-08: Window resize readjustment automatically re-clamps stored position', () => {
  const harness = createDraggableHarness({
    vpWidth: 1920,
    vpHeight: 1080,
    initialPosition: { x: 1494, y: 524 },
    elemRect: { left: 1494, top: 524, width: 410, height: 540 },
  });

  // Resize window from 1920x1080 down to 1024x768
  harness.handleResize(1024, 768);

  const newPos = harness.getPosition();
  // Clamped maxX = 1024 - 410 - 16 = 598
  // Clamped maxY = 768 - 540 - 16 = 212
  assert.equal(newPos.x, 598);
  assert.equal(newPos.y, 212);
  assert.ok(newPos.x + 410 <= 1024 - 16);
  assert.ok(newPos.y + 540 <= 768 - 16);
});

test('TC-INT-09: Disabled state ignores all pointer events', () => {
  const harness = createDraggableHarness({ disabled: true });

  harness.handlePointerDown({ clientX: 500, clientY: 500, button: 0 });
  assert.equal(harness.getDragInfo().pointerId, null);

  harness.handlePointerMove({ clientX: 600, clientY: 600 });
  assert.equal(harness.getPosition(), null);
  assert.equal(harness.isDragging(), false);
});

test('TC-INT-10: Non-primary pointer buttons (right-click / middle-click) ignored', () => {
  const harness = createDraggableHarness();

  // Right-click (button: 2)
  harness.handlePointerDown({ clientX: 500, clientY: 500, button: 2 });
  assert.equal(harness.getDragInfo().pointerId, null);

  // Middle-click (button: 1)
  harness.handlePointerDown({ clientX: 500, clientY: 500, button: 1 });
  assert.equal(harness.getDragInfo().pointerId, null);
});
