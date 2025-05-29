import { useEffect, RefObject } from 'react';
import { Platform } from 'react-native';

interface UseWebScrollPreventionProps {
  flatListRef: RefObject<any>;
  currentIndex: number;
  viewportHeight: number;
  personalizedFeedLength: number;
}

export const useWebScrollPrevention = ({
  flatListRef,
  currentIndex,
  viewportHeight,
  personalizedFeedLength
}: UseWebScrollPreventionProps) => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let scrollElement: HTMLElement | null = null;
    let isBlocking = false;
    let wheelHandler: ((e: WheelEvent) => void) | null = null;
    let touchStartHandler: ((e: TouchEvent) => void) | null = null;
    let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
    let scrollHandler: ((e: Event) => void) | null = null;

    const findScrollElement = () => {
      // Try multiple methods to find the scroll element
      if (flatListRef.current?.getScrollableNode) {
        const element = flatListRef.current.getScrollableNode() as HTMLElement;
        if (element) {
          return element;
        }
      }

      // Fallback: find by class or tag
      const candidates = [
        document.querySelector('[data-testid="flat-list"]'),
        document.querySelector('.rn-flatlist'),
        document.querySelector('[role="list"]'),
        document.querySelector('div[style*="overflow"]'),
        ...Array.from(document.querySelectorAll('div')).filter(el => 
          el.scrollHeight > el.clientHeight
        )
      ];

      for (const candidate of candidates) {
        if (candidate && candidate instanceof HTMLElement) {
          return candidate;
        }
      }

      return null;
    };

    const setupEventListeners = () => {
      scrollElement = findScrollElement();
      if (!scrollElement) {
        setTimeout(setupEventListeners, 100);
        return;
      }

      const maxAllowedScrollTop = (currentIndex + 1) * viewportHeight;
      const minAllowedScrollTop = currentIndex * viewportHeight;

      // Ultra-aggressive wheel handler
      wheelHandler = (e: WheelEvent) => {
        const currentPos = scrollElement!.scrollTop;
        
        // Calculate where scroll would go
        const futurePos = currentPos + e.deltaY;
        
        // Define strict boundaries
        const strictMinAllowed = minAllowedScrollTop;
        const strictMaxAllowed = maxAllowedScrollTop;
        
        // ALWAYS prevent default first, then decide what to do
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (isBlocking) return;
        
        // Check if we would exceed boundaries
        if (futurePos < strictMinAllowed || futurePos > strictMaxAllowed) {
          // Completely block - don't allow any movement beyond boundaries
          return; // Don't move at all
        }
        
        // Allow controlled movement within bounds only
        if (futurePos >= strictMinAllowed && futurePos <= strictMaxAllowed) {
          isBlocking = true;
          scrollElement!.scrollTop = futurePos;
          setTimeout(() => { isBlocking = false; }, 16); // Shorter timeout for smoother scrolling
        }
      };

      // Touch handlers
      let touchStartY = 0;
      let touchStartScrollTop = 0;

      touchStartHandler = (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
        touchStartScrollTop = scrollElement!.scrollTop;
      };

      touchMoveHandler = (e: TouchEvent) => {
        const touchCurrentY = e.touches[0].clientY;
        const touchDelta = touchStartY - touchCurrentY;
        const futurePos = touchStartScrollTop + touchDelta;
        
        // Define strict boundaries
        const strictMinAllowed = minAllowedScrollTop;
        const strictMaxAllowed = maxAllowedScrollTop;
        
        // ALWAYS prevent default first, then decide what to do
        e.preventDefault();
        e.stopPropagation();
        
        if (isBlocking) return;
        
        // Check if we would exceed boundaries
        if (futurePos < strictMinAllowed || futurePos > strictMaxAllowed) {
          // Completely block - don't allow any movement beyond boundaries
          return; // Don't move at all
        }
        
        // Allow controlled movement within bounds only
        if (futurePos >= strictMinAllowed && futurePos <= strictMaxAllowed) {
          isBlocking = true;
          scrollElement!.scrollTop = futurePos;
          setTimeout(() => { isBlocking = false; }, 16); // Shorter timeout for smoother scrolling
        }
      };

      // Scroll safety net
      scrollHandler = (e: Event) => {
        if (isBlocking) return;

        const currentPos = scrollElement!.scrollTop;
        
        if (currentPos < minAllowedScrollTop || currentPos > maxAllowedScrollTop) {
          isBlocking = true;
          const correctedPos = Math.max(minAllowedScrollTop, Math.min(maxAllowedScrollTop, currentPos));
          scrollElement!.scrollTop = correctedPos;
          setTimeout(() => { isBlocking = false; }, 50);
        }
      };

      // Add listeners with highest priority
      scrollElement.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
      scrollElement.addEventListener('touchstart', touchStartHandler, { passive: false, capture: true });
      scrollElement.addEventListener('touchmove', touchMoveHandler, { passive: false, capture: true });
      scrollElement.addEventListener('scroll', scrollHandler, { passive: false, capture: true });
      
      // Also add to window for extra coverage
      window.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
      window.addEventListener('touchmove', touchMoveHandler, { passive: false, capture: true });
    };

    // Start immediately
    setupEventListeners();

    return () => {
      // Cleanup
      if (scrollElement && wheelHandler) {
        scrollElement.removeEventListener('wheel', wheelHandler);
        scrollElement.removeEventListener('touchstart', touchStartHandler!);
        scrollElement.removeEventListener('touchmove', touchMoveHandler!);
        scrollElement.removeEventListener('scroll', scrollHandler!);
        window.removeEventListener('wheel', wheelHandler);
        window.removeEventListener('touchmove', touchMoveHandler!);
      }
    };
  }, [currentIndex, viewportHeight, personalizedFeedLength, flatListRef]);
}; 