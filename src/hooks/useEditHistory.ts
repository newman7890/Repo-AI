import { useState, useCallback } from "react";

interface EditEntry {
  resultImage: string;
  description: string;
  mode: string;
}

export const useEditHistory = () => {
  const [entries, setEntries] = useState<EditEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const push = useCallback((entry: EditEntry) => {
    setEntries((prev) => {
      // Trim any forward history when pushing new entry
      const trimmed = prev.slice(0, currentIndex + 1);
      return [...trimmed, entry];
    });
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < entries.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, entries.length]);

  const reset = useCallback(() => {
    setEntries([]);
    setCurrentIndex(-1);
  }, []);

  return {
    current: currentIndex >= 0 ? entries[currentIndex] : null,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < entries.length - 1,
    count: entries.length,
    currentIndex,
    push,
    undo,
    redo,
    reset,
  };
};
