import { pick, randInt, shuffle } from '../rng.js';
import { GLYPH_COLORS, GLYPH_SHAPES, mapDifficulty } from '../glyphs.js';

export function generateSwitch(rng, difficulty) {
  const n = 12 + difficulty;
  const randomSwitch = difficulty >= 5;
  const trials = [];
  let rule = pick(rng, ['color', 'shape']);
  for (let i = 0; i < n; i += 1) {
    if (randomSwitch) {
      if (rng() < 0.35) rule = rule === 'color' ? 'shape' : 'color';
    } else if (i > 0 && i % 4 === 0) {
      rule = rule === 'color' ? 'shape' : 'color';
    }
    const stim = {
      color: pick(rng, GLYPH_COLORS.slice(0, 4)),
      shape: pick(rng, GLYPH_SHAPES.slice(0, 4)),
    };
    const switched = i > 0 && trials[i - 1].rule !== rule;
    trials.push({ ...stim, rule, switched });
  }
  return {
    ui: 'switch',
    prompt: 'Suivez la règle affichée : trier par couleur ou par forme.',
    timeLimitMs: n * Math.max(900, 1700 - difficulty * 50) + 2000,
    data: { trials, prepMs: mapDifficulty(difficulty, 500, 120) },
    expected: { rules: trials.map((t) => t.rule) },
  };
}

export function generateWatch(rng, difficulty) {
  const channels = mapDifficulty(difficulty, 2, 4);
  const steps = 14 + difficulty;
  const target = 'X';
  const timeline = [];
  let targetAt = null;
  const hitStep = randInt(rng, 6, steps - 2);
  const hitCh = randInt(rng, 0, channels - 1);
  for (let s = 0; s < steps; s += 1) {
    const row = [];
    for (let c = 0; c < channels; c += 1) {
      const isHit = s === hitStep && c === hitCh;
      row.push(isHit ? target : pick(rng, 'BCDFGHJKLMNPRSTVWZ'.split('')));
      if (isHit) targetAt = { step: s, channel: c };
    }
    timeline.push(row);
  }
  return {
    ui: 'watch',
    prompt: `Touchez le canal dès que « ${target} » apparaît.`,
    timeLimitMs: steps * Math.max(450, 900 - difficulty * 30) + 2500,
    data: {
      channels,
      timeline,
      target,
      isiMs: Math.max(450, 900 - difficulty * 30),
      targetAt,
    },
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

export function generatePriority(rng, difficulty) {
  const n = mapDifficulty(difficulty, 2, 4);
  const labels = shuffle(rng, TASK_LABELS).slice(0, n);
  const tasks = labels.map((label, i) => ({
    id: i,
    label,
    urgency: randInt(rng, 20, 80),
  }));
  const speed = mapDifficulty(difficulty, 1, 4);
  return {
    ui: 'priority',
    prompt: 'Touchez la tâche la plus urgente maintenant — pas la plus ancienne.',
    timeLimitMs: 12000,
    data: { tasks, speed, freezeAfterMs: 3500 + difficulty * 200 },
    expected: { mode: 'highest-urgency' },
  };
}
