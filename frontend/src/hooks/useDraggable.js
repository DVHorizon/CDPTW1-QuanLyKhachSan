/**
 * useDraggable.js
 * Lightweight, zero-dependency custom React hook for viewport-constrained dragging
 * using native W3C Pointer Events, pointer capture, click-vs-drag disambiguation,
 * and passive window resize adaptation.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  clampPosition,
  isExceedingThreshold,
  DEFAULT_MARGIN,
  DRAG_THRESHOLD,
} from '../utils/draggableUtils';

export function useDraggable({
  margin = DEFAULT_MARGIN,
  dragThreshold = DRAG_THRESHOLD,
  disabled = false,
  initialPosition = null,
} = {}) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const targetRef = useRef(null);
  const dragInfoRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    initialElemX: 0,
    initialElemY: 0,
    hasMoved: false,
  });
  const suppressClickRef = useRef(false);

  // Passive window resize listener with boundary re-clamping
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const requestAnim =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb) => setTimeout(cb, 16);
    const cancelAnim =
      typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame
        : (id) => clearTimeout(id);

    let rafId = null;

    const handleResize = () => {
      if (rafId) cancelAnim(rafId);
      rafId = requestAnim(() => {
        setPosition((prev) => {
          if (!prev || !targetRef.current) return prev;
          const rect = targetRef.current.getBoundingClientRect();
          const clamped = clampPosition(
            prev.x,
            prev.y,
            rect.width,
            rect.height,
            window.innerWidth,
            window.innerHeight,
            margin
          );
          if (clamped.x === prev.x && clamped.y === prev.y) return prev;
          return clamped;
        });
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) cancelAnim(rafId);
    };
  }, [margin]);

  // Pointer Down handler
  const handlePointerDown = useCallback(
    (e, { isHandleCheck } = {}) => {
      if (disabled || (e.button !== undefined && e.button !== 0)) return;

      // Exclude interactive child elements (e.g. refresh button, close button, inputs)
      // If the handle element itself is a button (e.g. collapsed bubble), only exclude if target is a distinct inner interactive element
      if (e.target && typeof e.target.closest === 'function') {
        const closestInteractive = e.target.closest(
          'button, input, textarea, a, select, [data-no-drag]'
        );
        if (closestInteractive && closestInteractive !== e.currentTarget) {
          return;
        }
      }

      if (isHandleCheck && isHandleCheck(e)) {
        return;
      }

      const targetEl = targetRef.current;
      if (!targetEl) return;

      const rect = targetEl.getBoundingClientRect();
      const currentX = position ? position.x : rect.left;
      const currentY = position ? position.y : rect.top;

      dragInfoRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        initialElemX: currentX,
        initialElemY: currentY,
        hasMoved: false,
      };

      if (typeof e.currentTarget.setPointerCapture === 'function' && e.pointerId !== undefined) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Graceful fallback in environments where pointer capture isn't fully supported
        }
      }
    },
    [disabled, position]
  );

  // Pointer Move handler
  const handlePointerMove = useCallback(
    (e) => {
      const info = dragInfoRef.current;
      if (info.pointerId === null || info.pointerId !== e.pointerId || !targetRef.current) {
        return;
      }

      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;

      if (!info.hasMoved) {
        if (isExceedingThreshold(dx, dy, dragThreshold)) {
          info.hasMoved = true;
          setIsDragging(true);
        } else {
          return;
        }
      }

      const rect = targetRef.current.getBoundingClientRect();
      const rawX = info.initialElemX + dx;
      const rawY = info.initialElemY + dy;

      const vpW = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const vpH = typeof window !== 'undefined' ? window.innerHeight : 768;

      const clamped = clampPosition(rawX, rawY, rect.width, rect.height, vpW, vpH, margin);

      setPosition(clamped);
    },
    [dragThreshold, margin]
  );

  // Pointer Up & Cancel handler
  const handlePointerUp = useCallback((e) => {
    const info = dragInfoRef.current;
    if (info.pointerId === null || (e.pointerId !== undefined && info.pointerId !== e.pointerId)) {
      return;
    }

    if (
      e.currentTarget &&
      typeof e.currentTarget.releasePointerCapture === 'function' &&
      e.pointerId !== undefined
    ) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }

    if (info.hasMoved) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
        setIsDragging(false);
      }, 50);
    } else {
      setIsDragging(false);
    }

    info.pointerId = null;
    info.hasMoved = false;
  }, []);

  /**
   * Generates event handler props and styles for drag handle elements.
   *
   * @param {Object} options
   * @param {(e: PointerEvent) => boolean} [options.isInteractiveChild]
   * @returns {Object} Props to spread onto handle element
   */
  const getHandleProps = useCallback(
    (options = {}) => {
      const { isInteractiveChild } = options;

      return {
        onPointerDown: (e) => handlePointerDown(e, { isHandleCheck: isInteractiveChild }),
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        style: {
          touchAction: 'none',
          userSelect: 'none',
        },
      };
    },
    [handlePointerDown, handlePointerMove, handlePointerUp]
  );

  const resetPosition = useCallback(() => {
    setPosition(null);
  }, []);

  return {
    position,
    setPosition,
    targetRef,
    getHandleProps,
    isDragging,
    suppressClickRef,
    resetPosition,
  };
}
