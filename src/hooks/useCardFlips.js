import { useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useCardFlips() {
  const [flippedCards, setFlippedCards] = useState(new Set());
  const flipAnimationsRef = useRef({});

  const toggleCardFlip = (movie) => {
    const id = movie.id;
    const isFlipped = flippedCards.has(id);
    if (!flipAnimationsRef.current[id]) {
      flipAnimationsRef.current[id] = new Animated.Value(isFlipped ? 1 : 0);
    }

    Animated.spring(flipAnimationsRef.current[id], {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();

    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getFlipValue = (id) => {
    if (!flipAnimationsRef.current[id]) {
      flipAnimationsRef.current[id] = new Animated.Value(flippedCards.has(id) ? 1 : 0);
    }
    return flipAnimationsRef.current[id];
  };

  return {
    flippedCards,
    getFlipValue,
    toggleCardFlip,
  };
}
