import { useState, useEffect, useRef } from 'react';

/**
 * Hook personalizado para animar números desde 0 hasta un valor objetivo
 * @param {number} targetValue - El valor objetivo al que se debe llegar
 * @param {number} duration - Duración de la animación en milisegundos (default: 1000ms)
 * @param {number} delay - Delay antes de iniciar la animación en milisegundos (default: 0ms)
 * @param {any} resetKey - Clave que cuando cambia, fuerza el reinicio de la animación desde 0
 * @returns {number} - El valor animado actual
 */
const useAnimatedNumber = (targetValue, duration = 1000, delay = 0, resetKey = null) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);
  const animationFrameRef = useRef(null);
  const delayTimeoutRef = useRef(null);
  const prevResetKeyRef = useRef(resetKey);
  const animatedValueRef = useRef(0);

  // Sincronizar el ref con el estado
  useEffect(() => {
    animatedValueRef.current = animatedValue;
  }, [animatedValue]);

  useEffect(() => {
    // Si cambió el resetKey, reiniciar desde 0
    const resetKeyChanged = resetKey !== null && prevResetKeyRef.current !== resetKey;
    if (resetKeyChanged) {
      setAnimatedValue(0);
      startValueRef.current = 0;
      animatedValueRef.current = 0;
      prevResetKeyRef.current = resetKey;
    }

    // Resetear cuando cambia el valor objetivo
    if (targetValue === 0 || targetValue === null || targetValue === undefined) {
      setAnimatedValue(0);
      startValueRef.current = 0;
      animatedValueRef.current = 0;
      return;
    }

    // Cancelar animación anterior si existe
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }

    // Si cambió el resetKey, ya reseteamos arriba, sino empezar desde el valor actual
    if (!resetKeyChanged) {
      startValueRef.current = animatedValueRef.current;
    }
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
  }, [targetValue, duration, delay, resetKey]);

  return animatedValue;
};

export default useAnimatedNumber;

