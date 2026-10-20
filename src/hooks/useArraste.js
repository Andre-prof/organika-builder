import { useEffect, useRef, useState } from 'react';
import { gameStore } from '../store/useGameStore.js';
import { componenteDe, calcularEncaixe, posicaoDeInsercao } from '../scene/geometria.js';
import { Molecule } from '../domain/Molecule.js';

export function pontoNaBancada(svg, clientX, clientY) {
  if (!svg?.getScreenCTM()) return null;
  const point = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM().inverse());
  return { x: point.x, y: point.y };
}

/** Arrastar só produz uma alteração confirmada em pointerup. Escape cancela. */
export function useArraste(boardRef) {
  const [drag, setDrag] = useState(null);
  const active = useRef(null); const ignoreClickUntil = useRef(0);
  useEffect(() => {
    function move(event) {
      const task = active.current;
      if (!task || event.pointerId !== task.pointerId) return;
      if (Math.hypot(event.clientX - task.clientX, event.clientY - task.clientY) < 6 && !task.moved) return;
      // touch-action:none já controla a rolagem nas peças. Não cancelar os
      // eventos de movimento evita suprimir o próximo toque de navegação.
      task.moved = true;
      const svg = boardRef.current; const point = pontoNaBancada(svg, event.clientX, event.clientY);
      if (!point) return;
      const state = gameStore.getState(); const matrix = svg.getScreenCTM();
      const scale = Math.hypot(matrix.a, matrix.b);
      if (task.kind === 'palette') {
        const pose = posicaoDeInsercao(point);
        const poses = { ...state.poses, [task.fragment.id]: pose };
        const candidate = calcularEncaixe(task.molecule, poses, [task.fragment.id], scale);
        task.preview = { kind: task.kind, templateId: task.templateId, fragment: task.fragment, point, pose, poses, candidate, scale };
      } else {
        const poses = { ...task.poses };
        const moving = componenteDe(state.molecule, task.id);
        const dx = point.x - task.start.x; const dy = point.y - task.start.y;
        const minX = Math.min(...moving.map((id) => task.poses[id].x - 80));
        const maxX = Math.max(...moving.map((id) => task.poses[id].x + 80));
        const minY = Math.min(...moving.map((id) => task.poses[id].y - 80));
        const maxY = Math.max(...moving.map((id) => task.poses[id].y + 80));
        const x = Math.max(-minX, Math.min(960 - maxX, dx)); const y = Math.max(-minY, Math.min(560 - maxY, dy));
        for (const id of moving) poses[id] = { ...poses[id], x: poses[id].x + x, y: poses[id].y + y };
        const candidate = calcularEncaixe(state.molecule, poses, moving, scale);
        task.preview = { kind: task.kind, id: task.id, point, poses, candidate, scale };
      }
      setDrag(task.preview);
    }
    function cancel(event) {
      if (event?.pointerId !== undefined && active.current && event.pointerId !== active.current.pointerId) return;
      if (active.current?.moved) ignoreClickUntil.current = performance.now() + 350;
      const task = active.current;
      if (task?.capture?.hasPointerCapture?.(task.pointerId)) task.capture.releasePointerCapture(task.pointerId);
      active.current = null; setDrag(null);
    }
    function up(event) {
      const task = active.current;
      if (!task || event.pointerId !== task.pointerId) return;
      // Liberar a captura antes de a atualização esgotar/desabilitar a paleta.
      if (task.capture?.hasPointerCapture?.(task.pointerId)) task.capture.releasePointerCapture(task.pointerId);
      const preview = task.preview;
      if (task.moved && preview) {
        ignoreClickUntil.current = performance.now() + 350;
        const svg = boardRef.current; const rect = svg.getBoundingClientRect();
        const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (inside) {
          const state = gameStore.getState();
          if (task.kind === 'palette') state.adicionarPeca(task.templateId, posicaoDeInsercao(preview.point), true, preview.scale);
          else state.moverConjunto(task.id, preview.poses, true, preview.scale);
        }
      } else if (!task.moved && task.kind === 'fragment') gameStore.getState().selecionar(task.id);
      active.current = null; setDrag(null);
    }
    const escape = (e) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', escape); };
  }, [boardRef]);
  function iniciar(event, info) {
    if ((event.pointerType === 'mouse' && event.button !== 0) || event.isPrimary === false || active.current) return;
    const state = gameStore.getState();
    const start = pontoNaBancada(boardRef.current, event.clientX, event.clientY);
    if (!start) return;
    // Captura num elemento HTML estável, inclusive quando o dedo sai do SVG.
    const capture = info.kind === 'palette' ? event.currentTarget : boardRef.current?.closest('.workspace-scroll') || event.currentTarget;
    capture.setPointerCapture?.(event.pointerId);
    active.current = { ...info, capture, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, start, poses: state.poses, moved: false };
    if (info.kind === 'palette') {
      // Instância temporária para a prévia: nunca consome inventário nem altera a sessão.
      const preview = Molecule.restaurar(state.molecule);
      active.current.fragment = preview.adicionarFragmento(info.templateId).fragmento;
      active.current.molecule = preview.obterMolecula();
    }
  }
  return { drag, iniciar, cliqueDepoisDeArraste: () => performance.now() < ignoreClickUntil.current };
}
