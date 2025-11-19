import { useState, useEffect, useRef } from 'react';

/**
 * Hook personalizado para animar números desde 0 hasta un valor objetivo
 * @param {number} targetValue - El valor objetivo al que se debe llegar
 * @param {number} duration - Duración de la animación en milisegundos (default: 1000ms)
 * @param {number} delay - Delay antes de iniciar la animación en milisegundos (default: 0ms)
 * @returns {number} - El valor animado actual
 */
const useAnimatedNumber = (targetValue, duration = 1000, delay = 0) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);
  const animationFrameRef = useRef(null);
  const delayTimeoutRef = useRef(null);

  useEffect(() => {
    // Resetear cuando cambia el valor objetivo
    if (targetValue === 0 || targetValue === null || targetValue === undefined) {
      setAnimatedValue(0);
      return;
    }

    // Cancelar animación anterior si existe
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }

    startValueRef.current = animatedValue;
    startTimeRef.current = null;

    const startAnimation = () => {
      const animate = (currentTime) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = currentTime;
        }

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Usar easing ease-out para una animación más suave
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValueRef.current + (targetValue - startValueRef.current) * easeOut);

        setAnimatedValue(currentValue);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Asegurar que llegue exactamente al valor objetivo
          setAnimatedValue(targetValue);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (delay > 0) {
      delayTimeoutRef.current = setTimeout(() => {
        startAnimation();
      }, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [targetValue, duration, delay]);

  return animatedValue;
};

export default useAnimatedNumber;

