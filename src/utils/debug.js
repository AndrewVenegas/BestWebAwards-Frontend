/**
 * Función de debug que solo imprime si DEBUG_MODE está activado
 * @param {...any} args - Argumentos a imprimir (igual que console.log)
 */
const consoleDebug = (...args) => {
  const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.VITE_DEBUG_MODE === true;
  
  if (debugMode) {
    console.log(...args);
  }
};

export default consoleDebug;

