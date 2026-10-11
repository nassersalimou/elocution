import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(initialSeconds, { autoStart = false, onComplete } = {}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setIsComplete(false);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback((newSeconds) => {
    clear();
    const val = newSeconds ?? initialSeconds;
    setSeconds(val);
    setTotalSeconds(val);
    setIsRunning(false);
    setIsComplete(false);
  }, [initialSeconds, clear]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clear();
          setIsRunning(false);
          setIsComplete(true);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clear;
  }, [isRunning, clear]);

  const progress = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;

  return { seconds, isRunning, isComplete, progress, start, pause, reset, setSeconds };
}

export default useTimer;
