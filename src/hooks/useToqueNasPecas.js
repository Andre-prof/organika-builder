import { useEffect } from 'react';

/** SVG não aplica touch-action em grupos em todos os navegadores Android.
 * Bloqueie a rolagem somente quando o gesto começa sobre o corpo de uma peça. */
export function useToqueNasPecas(ref) {
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const start = event => {
      if (event.target.closest('.interactive-port, .progressive-port')) return;
      if (event.target.closest('.workspace-piece, .progressive-piece, .progressive-atom') && event.cancelable) event.preventDefault();
    };
    svg.addEventListener('touchstart', start, { passive: false });
    return () => svg.removeEventListener('touchstart', start);
  });
}
