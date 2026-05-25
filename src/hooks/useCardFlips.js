import { useState } from 'react';

export function useCardFlips() {
  const [flippedCards, setFlippedCards] = useState(new Set());

  const toggleCardFlip = (movie) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(movie.id)) next.delete(movie.id);
      else next.add(movie.id);
      return next;
    });
  };

  return { flippedCards, toggleCardFlip };
}
