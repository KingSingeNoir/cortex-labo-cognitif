/** Couverture locale de chaque jeu (photos libres, public/games/). */
export const GAME_COVERS = Object.freeze({
  enigmes: '/games/enigmes.jpg',
  'log-matrix': '/games/log-matrix.jpg',
  'log-sequence': '/games/log-sequence.jpg',
  'log-syllogism': '/games/log-syllogism.jpg',
  'imt-nback': '/games/imt-nback.jpg',
  'imt-span': '/games/imt-span.jpg',
  'imt-running': '/games/imt-running.jpg',
  'imt-dual': '/games/imt-dual.jpg',
  'irp-matrix': '/games/irp-matrix.jpg',
  'irp-rotation': '/games/irp-rotation.jpg',
  'irp-analogy': '/games/irp-analogy.jpg',
  'irp-series': '/games/irp-series.jpg',
  'ivt-code': '/games/ivt-code.jpg',
  'ivt-barrage': '/games/ivt-barrage.jpg',
  'ivt-stroop': '/games/ivt-stroop.jpg',
  'ivt-compare': '/games/ivt-compare.jpg',
  'att-mix-focus': '/games/att-mix-focus.jpg',
  'att-mix-reading': '/games/att-mix-reading.jpg',
  'att-mix-watch': '/games/att-mix-watch.jpg',
  'att-mix-recall': '/games/att-mix-recall.jpg',
  'vis-accom': '/games/vis-accom.jpg',
  'vis-pursuit': '/games/vis-pursuit.jpg',
  'vis-saccade': '/games/vis-saccade.jpg',
  'vis-blink': '/games/vis-blink.jpg',
});

export function coverOf(id) {
  return GAME_COVERS[id] || null;
}
