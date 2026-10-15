import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

const docs = new Map();

function loadPdf(url) {
  if (!docs.has(url)) docs.set(url, getDocument({ url, verbosity: 0 }).promise);
  return docs.get(url);
}

/** Coupe le blanc sous le dernier élément imprimé (texte ou figure). */
function trimBottom(canvas, padding) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let last = -1;
  for (let y = height - 1; y >= 0 && last < 0; y -= 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const i = row + x * 4;
      if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) {
        last = y;
        break;
      }
    }
  }
  const keep = Math.min(height, last < 0 ? height : last + padding);
  if (keep >= height - 2) return;
  const copy = ctx.getImageData(0, 0, width, keep);
  canvas.height = keep;
  ctx.putImageData(copy, 0, 0);
}

/** Affiche une zone (colonne, haut, bas) d’une page de PDF, illustrations comprises. */
export function PdfRegion({ url, segment, label }) {
  const canvasRef = useRef(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let task = null;
    setState('loading');
    (async () => {
      try {
        const pdf = await loadPdf(url);
        const page = await pdf.getPage(segment.page);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const scale = 2 * Math.min(2, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale });
        const width = (segment.x1 - segment.x0) * scale;
        const height = (segment.yTop - segment.yBottom) * scale;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.ceil(width);
        canvas.height = Math.ceil(height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        task = page.render({
          canvasContext: ctx,
          viewport,
          transform: [1, 0, 0, 1, -segment.x0 * scale, -(base.height - segment.yTop) * scale],
        });
        await task.promise;
        if (cancelled) return;
        trimBottom(canvas, Math.round(16 * scale));
        setState('ready');
      } catch (err) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') setState('error');
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [url, segment.page, segment.x0, segment.x1, segment.yTop, segment.yBottom]);

  return (
    <div className={`relative ${state === 'loading' ? 'min-h-[240px]' : ''}`}>
      {state === 'loading' && (
        <p className="absolute inset-x-0 top-6 text-center text-sm text-slate-400">Chargement…</p>
      )}
      {state === 'error' && (
        <p className="p-6 text-center text-sm text-rose-600">
          Impossible d’afficher cette page du document.
        </p>
      )}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className={`block h-auto w-full ${state === 'ready' ? '' : 'opacity-0'}`}
      />
    </div>
  );
}
