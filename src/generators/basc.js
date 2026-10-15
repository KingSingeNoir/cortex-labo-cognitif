import { pick, randInt, shuffle } from '../rng.js';
import { GLYPH_COLORS, GLYPH_SHAPES, mapDifficulty } from '../glyphs.js';
import { X_LURES } from '../scale.js';

/**
 * Bascule de règle (task switching, Pashler).
 * Volume : plus d’essais.
 * Subtilité : bascules imprévisibles plus tôt, plus de couleurs / formes.
 */
export function generateSwitch(rng, difficulty) {
  const n = mapDifficulty(difficulty, 8, 20);
  const randomSwitch = difficulty >= 4;
  const colors = GLYPH_COLORS.slice(0, mapDifficulty(difficulty, 3, 6));
  const shapes = GLYPH_SHAPES.slice(0, mapDifficulty(difficulty, 3, 5));
  const switchP = 0.18 + difficulty * 0.035;
  const trials = [];
  let rule = pick(rng, ['color', 'shape']);
  for (let i = 0; i < n; i += 1) {
    if (randomSwitch) {
      if (rng() < switchP) rule = rule === 'color' ? 'shape' : 'color';
    } else if (i > 0 && i % 5 === 0) {
      rule = rule === 'color' ? 'shape' : 'color';
    }
    const stim = {
      color: pick(rng, colors),
      shape: pick(rng, shapes),
    };
    const switched = i > 0 && trials[i - 1].rule !== rule;
    trials.push({ ...stim, rule, switched });
  }
  return {
    ui: 'switch',
    prompt: 'Suivez la règle affichée : trier par couleur ou par forme.',
    timeLimitMs: n * mapDifficulty(difficulty, 1800, 850) + 2000,
    data: { trials, prepMs: mapDifficulty(difficulty, 520, 90) },
    expected: { rules: trials.map((t) => t.rule) },
  };
}

/**
 * Veille multi-canaux.
 * Volume : 2 → 5 canaux, flux plus long.
 * Subtilité : leurres proches de X (K, Y, Z), rythme plus vif.
 */
export function generateWatch(rng, difficulty) {
  const channels = mapDifficulty(difficulty, 2, 5);
  const steps = mapDifficulty(difficulty, 12, 26);
  const target = 'X';
  const foils =
    difficulty >= 6
      ? [...X_LURES, ...'BCDFGHJKLMNPRSTVWZ'.split('')]
      : 'BCDFGHJKLMNPRSTVWZ'.split('');
  const timeline = [];
  let targetAt = null;
  const hitStep = randInt(rng, Math.max(4, Math.floor(steps / 3)), steps - 2);
  const hitCh = randInt(rng, 0, channels - 1);
  for (let s = 0; s < steps; s += 1) {
    const row = [];
    for (let c = 0; c < channels; c += 1) {
      const isHit = s === hitStep && c === hitCh;
      row.push(isHit ? target : pick(rng, foils));
      if (isHit) targetAt = { step: s, channel: c };
    }
    timeline.push(row);
  }
  const isiMs = mapDifficulty(difficulty, 950, 380);
  return {
    ui: 'watch',
    prompt:
      difficulty >= 6
        ? `Touchez le canal dès que « ${target} » apparaît. Certaines lettres voisines cherchent à vous faire toucher trop tôt.`
        : `Touchez le canal dès que « ${target} » apparaît.`,
    timeLimitMs: steps * isiMs + 2500,
    data: { channels, timeline, target, isiMs, targetAt },
    expected: { channel: hitCh, step: hitStep },
  };
}

const TASK_LABELS = [
  'Rappeler un client',
  'Envoyer le devis',
  'Valider la commande',
  'Répondre au courriel',
  'Réserver la salle',
  'Payer la facture',
  'Préparer la réunion',
  'Imprimer le contrat',
  'Signer le bon de livraison',
  'Relancer le fournisseur',
  'Mettre à jour le planning',
  'Vérifier le stock',
  'Arroser les plantes',
  'Sortir le linge',
  'Acheter du pain',
  'Prendre rendez-vous',
  'Récupérer un colis',
  'Recharger le téléphone',
  'Fermer les volets',
  'Nourrir le chat',
];

/**
 * Priorisation.
 * Volume : 2 → 5 tâches.
 * Subtilité : jauges plus proches, dérive plus rapide, fenêtre de décision plus courte.
 */
export function generatePriority(rng, difficulty) {
  const n = mapDifficulty(difficulty, 2, 5);
  const labels = shuffle(rng, TASK_LABELS).slice(0, n);
  const mid = randInt(rng, 38, 62);
  const spread = mapDifficulty(difficulty, 24, 5);
  const tasks = labels.map((label, i) => ({
    id: i,
    label,
    urgency: Math.max(8, Math.min(92, mid + (i - (n - 1) / 2) * spread + randInt(rng, -3, 3))),
  }));
  const speed = mapDifficulty(difficulty, 1, 5);
  return {
    ui: 'priority',
    prompt: 'Touchez la tâche la plus urgente maintenant — pas la plus ancienne.',
    timeLimitMs: mapDifficulty(difficulty, 14000, 8000),
    data: {
      tasks,
      speed,
      freezeAfterMs: mapDifficulty(difficulty, 4800, 2000),
    },
    expected: { mode: 'highest-urgency' },
  };
}
