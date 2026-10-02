#!/usr/bin/env node
/**
 * build-deck.js - genere la presentation de la sharing session.
 *
 *   cd presentation && npm install && node build-deck.js
 *
 * Sortie : presentation/n8n-git-linear.pptx
 *
 * Le deroule suit docs/06-demo.md minute par minute. Les slides de demo (5, 6, 7)
 * sont volontairement pauvres : l'ecran bascule sur le terminal, elles servent
 * seulement de repere quand la salle revient aux slides.
 */

const PptxGenJS = require('pptxgenjs');

// --- Charte, calee sur le logo n8n ----------------------------------------
const RED = 'EA4B71';
const RED_DARK = 'B8304F';
const RED_SOFT = 'F59CB2';
const DARK = '101330';
const WHITE = 'FFFFFF';
const LIGHT = 'F4F4F6';
const TEXT = '1A1A2E';
const MUTED = '5C5C6E'; // 6,5:1 sur LIGHT
const MUTED_DARK = '9FA0BE'; // 7:1 sur DARK

const H = 'Trebuchet MS';
const B = 'Calibri';

const HGT = 7.5;
const M = 0.7; // marge laterale
const RIGHT = 12.63; // bord droit commun a toutes les slides
const CW = RIGHT - M; // largeur de contenu : 11.93

// pptxgenjs laisse un contour par defaut avec { width: 0 } dans certains rendus.
const NOLINE = { type: 'none' };

// Typographie francaise : apostrophe courbe et espaces insecables.
const NB = ' ';
function fr(s) {
  return s
    .replace(/'/g, '’')
    .replace(/ ([?!;:»])/g, NB + '$1')
    .replace(/« /g, '«' + NB);
}

// Reserve aux paragraphes : jamais aux titres, ou cela degraderait la coupe.
function body(s) {
  return fr(s).replace(/ (\S+)$/gm, NB + '$1');
}

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Parfait Ahouanto';
pptx.title = 'git → Linear, avec n8n en local';

// --- Motif repete : le noeud n8n ------------------------------------------
function node(slide, x, y, { w = 0.34, h = 0.34, fill = RED, dotColor = WHITE, dot = true } = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: fill }, line: NOLINE, rectRadius: 0.08,
  });
  if (dot) {
    // Le point reste a l'interieur du noeud : sur un fond de meme couleur que le
    // noeud il disparaitrait, d'ou dotColor explicite.
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + w - 0.13, y: y + h / 2 - 0.045, w: 0.09, h: 0.09,
      fill: { color: dotColor }, line: NOLINE,
    });
  }
}

function nodeChain(slide, x, y, count, { fill = RED, dotColor = WHITE, gap = 0.62 } = {}) {
  for (let i = 0; i < count; i++) {
    const nx = x + i * gap;
    if (i > 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: nx - gap + 0.34, y: y + 0.155, w: gap - 0.34, h: 0.03,
        fill: { color: fill }, line: NOLINE,
      });
    }
    node(slide, nx, y, { fill, dotColor });
  }
}

// --- Encart : un seul style pour tout le deck -----------------------------
// Fond clair, barre rouge a gauche. La barre est un rectangle a angles droits :
// on l'encastre verticalement de 0,12 pour qu'elle ne sorte pas des coins arrondis.
function callout(slide, x, y, w, h, titre, texte, { titleSize = 18, bodySize = 14.5 } = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: LIGHT }, line: NOLINE, rectRadius: 0.1,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x, y: y + 0.12, w: 0.1, h: h - 0.24, fill: { color: RED }, line: NOLINE,
  });
  slide.addText(fr(titre), {
    x: x + 0.5, y: y + 0.2, w: w - 0.9, h: 0.38, margin: 0,
    fontFace: H, fontSize: titleSize, bold: true, color: RED_DARK,
  });
  slide.addText(body(texte), {
    x: x + 0.5, y: y + 0.6, w: w - 0.9, h: h - 0.8, margin: 0,
    fontFace: B, fontSize: bodySize, color: TEXT, lineSpacingMultiple: 1.2,
  });
}

// --- Pied de page : occupe la bande basse restee vide ----------------------
// Le pied de page doit connaitre son fond : sur la slide rouge, le rouge de la
// numerotation disparaissait. Et son x de depart : sur les slides de demo, une
// bande rouge occupe la gauche, le filet la traversait.
const FOOT = {
  light: { rule: 'E2E2E8', label: MUTED, num: RED_DARK },
  dark: { rule: '2A2E52', label: MUTED_DARK, num: RED },
  red: { rule: 'F288A2', label: DARK, num: DARK },
};
function footer(slide, section, num, { mode = 'light', x = M } = {}) {
  const c = FOOT[mode];
  const w = RIGHT - x;
  slide.addShape(pptx.ShapeType.rect, {
    x, y: 6.8, w, h: 0.02, fill: { color: c.rule }, line: NOLINE,
  });
  slide.addText(fr(section), {
    x, y: 6.9, w: w - 1.8, h: 0.3, margin: 0,
    fontFace: B, fontSize: 11, color: c.label,
  });
  slide.addText(`${num} / 20`, {
    x: RIGHT - 1.6, y: 6.9, w: 1.6, h: 0.3, margin: 0, align: 'right',
    fontFace: B, fontSize: 11, bold: true, color: c.num,
  });
}

// Bandeau de section en haut de slide claire.
function kicker(slide, label, y = 0.75) {
  node(slide, M, y);
  slide.addText(fr(label), {
    x: M + 0.55, y: y + 0.02, w: 6, h: 0.32, margin: 0, valign: 'middle',
    fontFace: B, fontSize: 13, bold: true, color: RED, charSpacing: 4,
  });
}

// =========================================================================
// 1 - Titre
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: DARK };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: HGT, fill: { color: RED }, line: NOLINE });

  s.addText('Le board se met\nà jour tout seul', {
    x: M + 0.25, y: 1.7, w: 10.5, h: 2.1, margin: 0,
    fontFace: H, fontSize: 56, bold: true, color: WHITE, lineSpacingMultiple: 1.0,
  });
  s.addText('git → Linear, avec n8n en local', {
    x: M + 0.25, y: 3.95, w: 10, h: 0.5, margin: 0,
    fontFace: B, fontSize: 24, color: 'C9CAE0',
  });

  nodeChain(s, M + 0.25, 5.3, 5);

  s.addText('Parfait Ahouanto', {
    x: M + 0.25, y: 6.2, w: 10, h: 0.4, margin: 0,
    fontFace: B, fontSize: 14, color: MUTED_DARK,
  });
  s.addNotes(
    "- Se presenter en une phrase\n" +
    "- Annoncer le sujet : automatiser la mise a jour du board Linear a partir du commit\n" +
    "- Ne pas montrer d'architecture tout de suite, garder la promesse pour plus tard"
  );
  footer(s, 'git → Linear  ·  n8n en local', 1, { mode: 'dark', x: M + 0.25 });
}

// =========================================================================
// 2 - La douleur (0 -> 3 min)
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'LE PROBLÈME');

  s.addText('Le board ment', {
    x: M, y: 1.30, w: CW, h: 0.85, margin: 0,
    fontFace: H, fontSize: 44, bold: true, color: TEXT,
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 2.5, w: CW, h: 1.78, fill: { color: LIGHT }, line: NOLINE, rectRadius: 0.1,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: M, y: 2.62, w: 0.1, h: 1.54, fill: { color: RED }, line: NOLINE,
  });
  s.addText(fr('« Ce board reflète-t-il ce sur quoi\non travaille en ce moment ? »'), {
    x: M + 0.5, y: 2.76, w: CW - 0.9, h: 1.3, margin: 0,
    fontFace: H, fontSize: 30, bold: true, color: TEXT, lineSpacingMultiple: 1.15,
  });

  s.addText(fr('Poser la question. Laisser le silence répondre.'), {
    x: M, y: 4.46, w: CW, h: 0.4, margin: 0,
    fontFace: B, fontSize: 16, color: MUTED, italic: true,
  });

  // Deux statistiques, sur la meme grille que le cadre au-dessus.
  const faits = [['3', 'tickets en Todo'], ['0', "ligne de code restant à écrire"]];
  faits.forEach(([n, t], i) => {
    const x = M + i * (CW / 2);
    s.addText(n, {
      x, y: 5.15, w: 0.78, h: 0.95, margin: 0,
      fontFace: H, fontSize: 54, bold: true, color: RED,
    });
    s.addText(fr(t), {
      x: x + 0.86, y: 5.45, w: CW / 2 - 1.06, h: 0.5, margin: 0, valign: 'middle',
      fontFace: B, fontSize: 17, color: TEXT,
    });
  });
  s.addNotes(
    "- Poser la question a voix haute, puis laisser le silence repondre (ne pas repondre soi-meme)\n" +
    "- Laisser la salle reagir avant d'enchainer\n" +
    "- Transition : ce n'est pas de la negligence"
  );
  footer(s, 'La douleur', 2);
}

// =========================================================================
// 3 - La vraie raison
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'LA VRAIE RAISON');

  s.addText(fr("Ce n'est pas de la négligence"), {
    x: M, y: 1.30, w: CW, h: 0.85, margin: 0,
    fontFace: H, fontSize: 44, bold: true, color: TEXT,
  });

  s.addText(fr("« Déplacer une carte n'apporte rien d'immédiat\nà celui qui la déplace. »"), {
    x: M, y: 2.5, w: 7.35, h: 1.6, margin: 0,
    fontFace: H, fontSize: 26, bold: true, color: RED_DARK, lineSpacingMultiple: 1.15,
  });
  s.addText(
    body("Le développeur commence une tâche. Le ticket, lui, ne bouge pas. Parfois il n'existe même pas encore. Le chef de projet n'a alors aucune idée de ce qui se passe réellement."),
    {
      x: M, y: 4.32, w: 7.1, h: 1.5, margin: 0,
      fontFace: B, fontSize: 16, color: TEXT, lineSpacingMultiple: 1.3,
    },
  );

  const cx = 8.35;
  s.addShape(pptx.ShapeType.roundRect, {
    x: cx, y: 2.5, w: RIGHT - cx, h: 3.35, fill: { color: LIGHT }, line: NOLINE, rectRadius: 0.12,
  });

  s.addText('QUI PAIE', {
    x: cx + 0.42, y: 2.82, w: 3.4, h: 0.3, margin: 0,
    fontFace: B, fontSize: 12, bold: true, color: MUTED, charSpacing: 3,
  });
  s.addText(fr('le développeur'), {
    x: cx + 0.42, y: 3.14, w: 3.4, h: 0.44, margin: 0,
    fontFace: H, fontSize: 21, bold: true, color: TEXT,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: cx + 0.42, y: 3.82, w: RIGHT - cx - 0.84, h: 0.02, fill: { color: 'D2D2DC' }, line: NOLINE,
  });
  s.addText('QUI EN PROFITE', {
    x: cx + 0.42, y: 4.06, w: 3.4, h: 0.3, margin: 0,
    fontFace: B, fontSize: 12, bold: true, color: MUTED, charSpacing: 3,
  });
  s.addText(fr('le chef de projet'), {
    x: cx + 0.42, y: 4.38, w: 3.4, h: 0.44, margin: 0,
    fontFace: H, fontSize: 21, bold: true, color: RED_DARK,
  });
  s.addText(fr("Suivre l'avancement, évaluer la charge de chacun, savoir qui est disponible : utile, mais jamais pour celui qui déplace la carte."), {
    x: cx + 0.42, y: 4.98, w: RIGHT - cx - 0.84, h: 0.7, margin: 0,
    fontFace: B, fontSize: 13.5, color: MUTED, italic: true, lineSpacingMultiple: 1.2,
  });
  s.addNotes(
    "- Le dev commence une tache, le ticket ne bouge pas (ou n'existe pas encore)\n" +
    "- Le chef de projet n'a aucune visibilite reelle sur ce qui avance\n" +
    "- Insister : ce n'est pas un probleme de discipline, c'est un probleme d'incitation. Celui qui agit n'est pas celui qui en profite"
  );
  footer(s, 'La vraie raison', 3);
}

// =========================================================================
// 4 - La promesse (3 -> 5 min)
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: RED };

  // Ornement a droite : un petit graphe de noeuds, en rose clair sur le rouge.
  // Colonne de noeuds relies verticalement, plus une derivation vers la droite.
  // Tout reste en deca du bord droit commun (12,63).
  const OX = 9.6;
  [1.85, 2.9, 3.95].forEach((y) => {
    s.addShape(pptx.ShapeType.rect, {
      x: OX + 0.28, y: y + 0.62, w: 0.035, h: 0.43, fill: { color: RED_SOFT }, line: NOLINE,
    });
  });
  s.addShape(pptx.ShapeType.rect, {
    x: OX + 0.62, y: 3.19, w: 0.79, h: 0.035, fill: { color: RED_SOFT }, line: NOLINE,
  });
  [[OX, 1.85], [OX, 2.9], [OX, 3.95], [OX, 5.0], [OX + 1.41, 2.9]].forEach(([x, y]) => {
    node(s, x, y, { w: 0.62, h: 0.62, fill: RED_SOFT, dotColor: RED_DARK });
  });

  s.addText('LA PROMESSE', {
    x: M, y: 1.3, w: 8, h: 0.35, margin: 0,
    fontFace: B, fontSize: 14, bold: true, color: DARK, charSpacing: 4,
  });
  s.addText(
    fr("Le board se met à jour\nà partir de la seule chose\nqu'un développeur fait toujours"),
    {
      x: M, y: 1.92, w: 8.4, h: 2.4, margin: 0,
      fontFace: H, fontSize: 34, bold: true, color: WHITE, lineSpacingMultiple: 1.15,
    },
  );
  s.addText('commiter', {
    x: M, y: 4.45, w: 8.4, h: 1.3, margin: 0,
    fontFace: H, fontSize: 84, bold: true, color: WHITE,
  });
  s.addNotes(
    "- Annoncer la solution en une phrase avant de montrer quoi que ce soit a l'ecran\n" +
    "- Garder le suspense : ne pas ouvrir n8n maintenant, montrer le résultat d'abord (prochaines slides)"
  );
  footer(s, 'La promesse', 4, { mode: 'red' });
}

// =========================================================================
// 5, 6, 7 - Les trois demos
// =========================================================================
function demoSlide(num, section, titre, accroche, corps, encart, page, notes) {
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 2.9, h: HGT, fill: { color: RED }, line: NOLINE });

  // Numero et libelle dans UNE seule boite : aucun risque de chevauchement.
  s.addText(
    [
      { text: num, options: { fontSize: 104, fontFace: H, bold: true, breakLine: true } },
      { text: 'DÉMO', options: { fontSize: 15, fontFace: B, bold: true, charSpacing: 4 } },
    ],
    { x: 0, y: 2.25, w: 2.9, h: 2.2, align: 'center', valign: 'top', margin: 0, color: WHITE },
  );

  const X = 3.6;
  const CWD = RIGHT - X; // 9.03, meme bord droit que le reste du deck

  s.addText(fr(titre), {
    x: X, y: 1.30, w: CWD, h: 0.95, margin: 0,
    fontFace: H, fontSize: 42, bold: true, color: TEXT,
  });
  s.addText(fr(accroche), {
    x: X, y: 2.33, w: CWD, h: 0.95, margin: 0,
    fontFace: B, fontSize: 19, color: MUTED, italic: true, lineSpacingMultiple: 1.2,
  });
  s.addText(body(corps), {
    x: X, y: 3.42, w: CWD, h: 0.6, margin: 0,
    fontFace: B, fontSize: 16, color: TEXT,
  });

  callout(s, X, 4.58, CWD, 1.5, encart.titre, encart.texte, { titleSize: 17 });

  if (notes) s.addNotes(notes);
  footer(s, section, page, { x: X });
  return s;
}

demoSlide(
  '01', 'Démo 1, le cas simple',
  'Le cas simple',
  "L'identifiant du ticket est déjà dans le nom de la branche.",
  'feat/ALO-42-relance-paiement  →  ALO-42 passe en In Progress',
  {
    titre: 'Aucune IA ici',
    texte: "n8n lit la branche, trouve la référence, met le ticket à jour. Instantané et gratuit.\nMontrer que la base fonctionne sans magie rend la suite crédible.",
  },
  5,
  "- Terminal pret a l'avance : branche et commit deja faits, ne jamais taper de code en direct\n" +
  "- git-sync, puis basculer sur Linear et rafraichir devant la salle\n" +
  "- Dire explicitement : aucune IA ici, juste le nom de la branche lu"
);

demoSlide(
  '02', 'Démo 2, le suivi continu',
  'Le suivi continu',
  "Plusieurs commits sur le même ticket, sans jamais le fermer soi-même.",
  'git-sync  →  chaque commit ajoute un commentaire, le ticket reste In Progress',
  {
    titre: 'Rien ne se perd',
    texte: "Chaque synchro ajoute son propre commentaire d'historique. Le ticket ne bouge que lorsque le développeur le décide explicitement.",
  },
  6,
  "- Faire 2-3 commits successifs sur le meme ticket, sans closes-all\n" +
  "- Montrer les commentaires qui s'accumulent dans Linear a chaque git-sync\n" +
  "- Insister : le statut ne bouge que si le dev le decide explicitement, jamais tout seul"
);

demoSlide(
  '03', 'Démo 3, le passage en Done',
  'Le passage en Done',
  'Le mot-clé closes-all, et de vrais tests, jamais une estimation.',
  'git commit -m "... (closes-all)"  →  tests réels exécutés en local  →  Done',
  {
    titre: 'Une vérification réelle, pas une supposition',
    texte: "Les tests tournent sur la machine du développeur, avant tout envoi. n8n ne lit qu'un résultat pass/fail, jamais de code, jamais de devinette.",
  },
  7,
  "- Montrer le commit avec (closes-all) dans le message avant de lancer git-sync\n" +
  "- Pendant que ca tourne, expliquer que les tests s'executent en LOCAL avant meme l'envoi a n8n\n" +
  "- Rafraichir Linear : le ticket passe en Done avec le recap des verifications en commentaire"
);

// =========================================================================
// 8 - n8n, en deux mots
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'AVANT L’ARCHITECTURE');

  s.addText(fr('n8n, en deux mots'), {
    x: M, y: 1.30, w: CW, h: 0.78, margin: 0,
    fontFace: H, fontSize: 40, bold: true, color: TEXT,
  });
  s.addText(
    fr("Un workflow, c'est une suite de nœuds reliés par des flèches, qui s'exécute automatiquement à chaque déclenchement. Un outil visuel, plutôt qu'un programme classique."),
    {
      x: M, y: 2.05, w: CW, h: 0.55, margin: 0,
      fontFace: B, fontSize: 16, color: MUTED,
    },
  );

  nodeChain(s, M, 3.0, 4, { gap: 0.9 });
  const chainLabels = ['Déclencheur', 'Nœud', 'Nœud', 'Nœud'];
  chainLabels.forEach((t, i) => {
    s.addText(t, {
      x: M + i * 0.9 - 0.3, y: 3.42, w: 0.94, h: 0.3, margin: 0, align: 'center',
      fontFace: B, fontSize: 10.5, color: MUTED,
    });
  });

  const GAP = 0.33;
  const VW = (CW - 3 * GAP) / 4;
  const vocab = [
    ['Déclencheur', 'démarre le workflow (ici, un webhook appelé par git-sync)'],
    ['Logique (IF)', 'teste une condition, choisit une branche : vrai ou faux'],
    ['Code', 'transforme ou calcule une donnée avec un peu de JavaScript'],
    ['Action (API)', 'appelle un service externe : Linear, Claude'],
  ];
  // Une icone distincte par type de noeud, meme palette que le reste du deck.
  const icons = [
    (x, y) => node(s, x, y, { w: 0.36, h: 0.36, fill: RED_DARK }),
    (x, y) => s.addShape(pptx.ShapeType.diamond, {
      x, y, w: 0.36, h: 0.36, fill: { color: RED_DARK }, line: NOLINE,
    }),
    (x, y) => {
      s.addShape(pptx.ShapeType.roundRect, {
        x, y, w: 0.36, h: 0.36, fill: { color: RED_DARK }, line: NOLINE, rectRadius: 0.07,
      });
      s.addText('{ }', {
        x, y: y - 0.01, w: 0.36, h: 0.36, margin: 0, align: 'center', valign: 'middle',
        fontFace: H, fontSize: 12, bold: true, color: WHITE,
      });
    },
    (x, y) => s.addShape(pptx.ShapeType.ellipse, {
      x, y, w: 0.36, h: 0.36, fill: { color: RED_DARK }, line: NOLINE,
    }),
  ];
  vocab.forEach(([t, d], i) => {
    const x = M + i * (VW + GAP);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 4.05, w: VW, h: 1.85, fill: { color: LIGHT }, line: NOLINE, rectRadius: 0.1,
    });
    icons[i](x + 0.2, 4.22);
    s.addText(fr(t), {
      x: x + 0.2, y: 4.62, w: VW - 0.4, h: 0.34, margin: 0,
      fontFace: H, fontSize: 16, bold: true, color: RED_DARK,
    });
    s.addText(fr(d), {
      x: x + 0.2, y: 4.98, w: VW - 0.4, h: 0.85, margin: 0,
      fontFace: B, fontSize: 11.5, color: MUTED, lineSpacingMultiple: 1.2,
    });
  });

  s.addNotes(
    "- Aller vite, 1 minute max sur cette slide\n" +
    "- Un workflow = une suite de noeuds relies par des fleches, qui s'execute automatiquement\n" +
    "- 4 types de noeuds suffisent a tout ce workflow : Declencheur, Logique (IF), Code, Action (appel API)\n" +
    "- Juste poser le vocabulaire avant de montrer l'architecture reelle du projet sur la slide suivante"
  );
  footer(s, 'n8n, en deux mots', 8);
}

// =========================================================================
// 9 - Comment un workflow s'execute
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'AVANT L’ARCHITECTURE');

  s.addText(fr("Comment un workflow s'exécute"), {
    x: M, y: 1.30, w: CW, h: 0.78, margin: 0,
    fontFace: H, fontSize: 36, bold: true, color: TEXT,
  });

  const mechanics = [
    {
      t: 'Dans l’ordre des flèches',
      d: "Chaque nœud reçoit la sortie du précédent, et s'exécute dans l'ordre des connexions dessinées sur le canvas.",
    },
    {
      t: 'Les nœuds IF créent des branches',
      d: "Un workflow peut suivre un chemin ou un autre selon une condition : vrai d'un côté, faux de l'autre, jamais les deux à la fois.",
    },
    {
      t: 'Chaque passage est une Execution',
      d: "Visible dans l'onglet Executions de n8n, nœud par nœud, avec les données exactes à chaque étape : l'outil de diagnostic principal.",
    },
  ];
  const MH = 1.3;
  mechanics.forEach((m, i) => {
    const y = 2.3 + i * (MH + 0.22);
    s.addShape(pptx.ShapeType.roundRect, {
      x: M, y, w: CW, h: MH, fill: { color: LIGHT }, line: NOLINE, rectRadius: 0.1,
    });
    node(s, M + 0.3, y + MH / 2 - 0.17, { w: 0.34, h: 0.34 });
    s.addText(fr(m.t), {
      x: M + 0.86, y: y + 0.18, w: CW - 1.1, h: 0.36, margin: 0,
      fontFace: H, fontSize: 17, bold: true, color: TEXT,
    });
    s.addText(body(m.d), {
      x: M + 0.86, y: y + 0.58, w: CW - 1.1, h: 0.62, margin: 0,
      fontFace: B, fontSize: 13, color: MUTED, lineSpacingMultiple: 1.2,
    });
  });

  s.addNotes(
    "- Insister sur Executions comme outil de diagnostic si quelqu'un demande \"et si ca plante ?\"\n" +
    "- Ne pas s'attarder sur les details techniques, juste planter le decor avant l'architecture reelle"
  );
  footer(s, 'Comment ça s’exécute', 9);
}

// =========================================================================
// 10 - Architecture interne de n8n
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'POUR ALLER PLUS LOIN');

  s.addText(fr('Architecture interne de n8n'), {
    x: M, y: 1.30, w: CW, h: 0.78, margin: 0,
    fontFace: H, fontSize: 36, bold: true, color: TEXT,
  });
  s.addText(
    fr("Techniquement, n8n est une application Node.js / TypeScript, structurée en plusieurs briques."),
    {
      x: M, y: 2.08, w: CW, h: 0.5, margin: 0,
      fontFace: B, fontSize: 16, color: MUTED,
    },
  );

  const BGAP = 0.4;
  const BW3 = (CW - 2 * BGAP) / 3;
  const briques = [
    ['Moteur d’exécution', '(n8n-core)', "Sait lire un workflow, le JSON qu'on édite directement, et le faire tourner."],
    ['Les nœuds', '(n8n-nodes-base)', "Chaque type (Webhook, Code, IF, HTTP Request) est un module avec une fonction execute()."],
    ['Serveur HTTP', '(Express)', "Sert l'éditeur visuel, expose l'API, écoute les webhooks entrants comme celui de git-sync."],
  ];
  briques.forEach(([t, sub, d], i) => {
    const x = M + i * (BW3 + BGAP);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.85, w: BW3, h: 2.5, fill: { color: LIGHT }, line: NOLINE, rectRadius: 0.12,
    });
    s.addText(fr(t), {
      x: x + 0.26, y: 3.08, w: BW3 - 0.52, h: 0.4, margin: 0,
      fontFace: H, fontSize: 18, bold: true, color: RED_DARK,
    });
    s.addText(sub, {
      x: x + 0.26, y: 3.46, w: BW3 - 0.52, h: 0.3, margin: 0,
      fontFace: B, fontSize: 12, italic: true, color: MUTED,
    });
    s.addText(fr(d), {
      x: x + 0.26, y: 3.9, w: BW3 - 0.52, h: 1.35, margin: 0,
      fontFace: B, fontSize: 13, color: TEXT, lineSpacingMultiple: 1.25,
    });
  });

  callout(
    s, M, 5.55, CW, 1.0,
    'Le JSON que tu édites, c’est le workflow',
    "Pas de couche cachée : ce qu'on modifie dans workflows/git-linear-sync.json est exactement ce que le moteur execute.",
    { titleSize: 15, bodySize: 12.5 },
  );

  s.addNotes(
    "- Slide optionnelle, pour qui demande comment n8n est construit en interne\n" +
    "- 3 briques : le moteur qui execute, les noeuds qui font le travail, le serveur HTTP qui recoit les appels\n" +
    "- Insister : le JSON qu'on edite est litteralement ce que n8n fait tourner, pas une representation separee"
  );
  footer(s, 'Architecture interne', 10);
}

// =========================================================================
// 11 - Le format JSON d'un workflow
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'POUR ALLER PLUS LOIN');

  s.addText(fr("Le format JSON d'un workflow"), {
    x: M, y: 1.25, w: CW, h: 0.6, margin: 0,
    fontFace: H, fontSize: 30, bold: true, color: TEXT,
  });
  s.addText(
    fr("Pas de couche cachée : ce qu'on édite dans workflows/git-linear-sync.json est exactement ce que le moteur exécute."),
    {
      x: M, y: 1.88, w: CW, h: 0.45, margin: 0,
      fontFace: B, fontSize: 14, color: MUTED,
    },
  );

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 2.42, w: CW, h: 2.65, fill: { color: DARK }, line: NOLINE, rectRadius: 0.1,
  });
  const jsonLines = [
    '{',
    '  "nodes": [',
    '    { "name": "Webhook", "type": "n8n-nodes-base.webhook",',
    '      "parameters": { "httpMethod": "POST", "path": "git-sync" } },',
    '    { "name": "Analyser le contexte", "type": "n8n-nodes-base.code",',
    '      "parameters": { "jsCode": "..." } }',
    '  ],',
    '  "connections": {',
    '    "Webhook": { "main": [[{ "node": "Analyser le contexte" }]] }',
    '  }',
    '}',
  ].join('\n');
  s.addText(jsonLines, {
    x: M + 0.3, y: 2.58, w: CW - 0.6, h: 2.35, margin: 0,
    fontFace: 'Courier New', fontSize: 11, color: 'E8E8F0', lineSpacingMultiple: 1.2,
  });

  const KGAP = 0.22;
  const KW = (CW - 4 * KGAP) / 5;
  const keys = [
    ['nodes', 'tableau, un objet par nœud sur le canvas'],
    ['name', 'le nom affiché, utilisé par connections'],
    ['type', 'le genre de nœud : webhook, code, if...'],
    ['parameters', 'la config propre à ce nœud'],
    ['connections', 'les flèches entre les nœuds'],
  ];
  keys.forEach(([t, d], i) => {
    const x = M + i * (KW + KGAP);
    s.addText(t, {
      x, y: 5.22, w: KW, h: 0.28, margin: 0,
      fontFace: 'Courier New', fontSize: 12.5, bold: true, color: RED_DARK,
    });
    s.addText(fr(d), {
      x, y: 5.52, w: KW, h: 0.85, margin: 0,
      fontFace: B, fontSize: 10.5, color: MUTED, lineSpacingMultiple: 1.15,
    });
  });

  s.addNotes(
    "- Slide optionnelle : montrer que le JSON n'a rien de mysterieux, c'est juste des objets et des tableaux\n" +
    "- Le code du noeud 'Analyser le contexte' est raccourci ici (\"...\"), le vrai fichier contient le script complet\n" +
    "- position n'est pas dans l'extrait : ca ne sert qu'a l'affichage sur le canvas, aucun effet sur le comportement"
  );
  footer(s, 'Le format JSON', 11);
}

// =========================================================================
// 12 - Du webhook a la reponse
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'POUR ALLER PLUS LOIN');

  s.addText(fr('Du webhook à la réponse, étape par étape'), {
    x: M, y: 1.30, w: CW, h: 0.7, margin: 0,
    fontFace: H, fontSize: 30, bold: true, color: TEXT,
  });

  const steps = [
    ['Réception', "le serveur HTTP reçoit le POST de git-sync sur /webhook/git-sync"],
    ['Association', "il retrouve le workflow lié à ce chemin, démarre une exécution"],
    ['Parcours du graphe', "le moteur suit les connections, nœud par nœud"],
    ['Format commun', "chaque nœud reçoit et renvoie un tableau [{ json: {...} }]"],
    ['Branches IF', "sortie 0 = vrai, sortie 1 = faux : détermine la suite"],
    ['Réponse', "le nœud Respond to Webhook renvoie la réponse HTTP"],
    ['Traçabilité', "tout est sauvegardé, visible dans l'onglet Executions"],
  ];
  const SH = 0.56;
  steps.forEach(([t, d], i) => {
    const y = 2.18 + i * (SH + 0.1);
    s.addShape(pptx.ShapeType.ellipse, {
      x: M, y: y + 0.03, w: 0.34, h: 0.34, fill: { color: RED_DARK }, line: NOLINE,
    });
    s.addText(String(i + 1), {
      x: M, y: y + 0.03, w: 0.34, h: 0.34, margin: 0, align: 'center', valign: 'middle',
      fontFace: H, fontSize: 14, bold: true, color: WHITE,
    });
    s.addText(fr(t), {
      x: M + 0.52, y, w: 2.6, h: SH, margin: 0, valign: 'middle',
      fontFace: H, fontSize: 14, bold: true, color: RED_DARK,
    });
    s.addText(fr(d), {
      x: M + 3.25, y, w: CW - 3.25, h: SH, margin: 0, valign: 'middle',
      fontFace: B, fontSize: 13, color: TEXT,
    });
    if (i < steps.length - 1) {
      s.addShape(pptx.ShapeType.rect, {
        x: M + 0.165, y: y + SH + 0.03, w: 0.012, h: 0.1, fill: { color: 'D2D2DC' }, line: NOLINE,
      });
    }
  });

  s.addNotes(
    "- Slide optionnelle, technique : derouler les 7 etapes si quelqu'un demande le detail\n" +
    "- Les etapes 4 et 5 sont les plus interessantes pour un dev : format de données commun, et comment une branche IF choisit son chemin"
  );
  footer(s, 'Du webhook à la réponse', 12);
}

// =========================================================================
// 12 - n8n et Postgres
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'POUR ALLER PLUS LOIN');

  s.addText(fr('n8n et Postgres'), {
    x: M, y: 1.30, w: CW, h: 0.7, margin: 0,
    fontFace: H, fontSize: 36, bold: true, color: TEXT,
  });
  s.addText(
    fr("n8n utilise un ORM (TypeORM), une bibliothèque qui traduit du code en requêtes SQL, pour parler à Postgres."),
    {
      x: M, y: 2.08, w: CW, h: 0.5, margin: 0,
      fontFace: B, fontSize: 16, color: MUTED,
    },
  );

  // Schema : deux conteneurs relies par le DNS interne de Docker.
  const SY = 2.9;
  const SBW = 3.6;
  const containers = [
    ['n8n', 'conteneur Docker'],
    ['postgres', 'conteneur Docker'],
  ];
  containers.forEach(([t, d], i) => {
    const x = i === 0 ? M : RIGHT - SBW;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: SY, w: SBW, h: 1.1, fill: { color: i === 0 ? RED_DARK : DARK }, line: NOLINE, rectRadius: 0.1,
    });
    s.addText(t, {
      x: x + 0.3, y: SY + 0.18, w: SBW - 0.6, h: 0.45, margin: 0,
      fontFace: H, fontSize: 22, bold: true, color: WHITE,
    });
    s.addText(fr(d), {
      x: x + 0.3, y: SY + 0.65, w: SBW - 0.6, h: 0.35, margin: 0,
      fontFace: B, fontSize: 12.5, color: i === 0 ? 'FFD9E2' : 'C9CAE0',
    });
  });
  s.addShape(pptx.ShapeType.rect, {
    x: M + SBW + 0.1, y: SY + 0.53, w: RIGHT - SBW - (M + SBW) - 0.2, h: 0.03,
    fill: { color: RED }, line: NOLINE,
  });
  s.addText(fr('DNS interne Docker : "postgres"'), {
    x: M + SBW + 0.1, y: SY - 0.38, w: RIGHT - SBW - (M + SBW) - 0.2, h: 0.35, margin: 0,
    align: 'center', fontFace: B, fontSize: 11.5, italic: true, color: MUTED,
  });

  const pgPoints = [
    "docker-compose.yml fixe DB_POSTGRESDB_HOST=postgres, DB_POSTGRESDB_PORT=5432, etc.",
    "« postgres » n'est pas une adresse réseau classique : c'est le nom du service Docker, résolu automatiquement.",
    "Les deux conteneurs se parlent directement sur le réseau Docker, jamais via localhost ni la machine hôte.",
    "Chaque action (sauvegarder un workflow, enregistrer une exécution, lire une credential) devient une requête SQL.",
  ];
  pgPoints.forEach((txt, i) => {
    const y = 4.5 + i * 0.52;
    node(s, M, y + 0.04, { w: 0.22, h: 0.22 });
    s.addText(fr(txt), {
      x: M + 0.42, y, w: CW - 0.42, h: 0.5, margin: 0, valign: 'middle',
      fontFace: B, fontSize: 13, color: TEXT,
    });
  });

  s.addNotes(
    "- Slide optionnelle, technique : pour qui demande ce que Postgres stocke et comment n8n lui parle\n" +
    "- Insister sur le nom de service Docker : ce n'est pas de la magie, c'est du DNS interne standard\n" +
    "- Rappeler que demo-book-crud n'utilise pas ce Postgres : ses donnees sont en memoire, perdues au redemarrage"
  );
  footer(s, 'n8n et Postgres', 13);
}

// =========================================================================
// 13 - Les etats d'un noeud
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'POUR ALLER PLUS LOIN');

  s.addText(fr("Les états d'un nœud"), {
    x: M, y: 1.30, w: CW, h: 0.7, margin: 0,
    fontFace: H, fontSize: 36, bold: true, color: TEXT,
  });

  // --- Bloc 1 : avant l'execution, actif ou desactive ------------------------
  s.addText('AVANT L’EXÉCUTION', {
    x: M, y: 2.08, w: 6, h: 0.3, margin: 0,
    fontFace: B, fontSize: 12, bold: true, color: MUTED, charSpacing: 3,
  });
  const CFGW = (CW - 0.4) / 2;
  const cfgStates = [
    ['Actif', RED_DARK, WHITE, "fait partie du workflow, s'exécute normalement à chaque passage"],
    ['Désactivé', '9AA0A6', WHITE, "ignoré par le moteur : ses données d'entrée passent telles quelles au nœud suivant, sans exécuter son code"],
  ];
  cfgStates.forEach(([t, fill, fg, d], i) => {
    const x = M + i * (CFGW + 0.4);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.42, w: CFGW, h: 1.15, fill: { color: fill }, line: NOLINE, rectRadius: 0.1,
    });
    s.addText(fr(t), {
      x: x + 0.24, y: 2.56, w: CFGW - 0.48, h: 0.34, margin: 0,
      fontFace: H, fontSize: 17, bold: true, color: fg,
    });
    s.addText(fr(d), {
      x: x + 0.24, y: 2.9, w: CFGW - 0.48, h: 0.6, margin: 0,
      fontFace: B, fontSize: 12, color: fg, lineSpacingMultiple: 1.2,
    });
  });

  // --- Bloc 2 : pendant / apres l'execution, visible dans Executions --------
  s.addText('APRÈS UNE EXÉCUTION (ONGLET EXECUTIONS)', {
    x: M, y: 3.85, w: 8, h: 0.3, margin: 0,
    fontFace: B, fontSize: 12, bold: true, color: MUTED, charSpacing: 3,
  });
  const EXW = (CW - 2 * 0.3) / 3;
  const execStates = [
    ['2ECC71', 'Succès', "le nœud a tourné et renvoyé ses données"],
    ['E74C3C', 'Erreur', "le nœud a planté, l'exécution s'arrête là"],
    ['9AA0A6', 'Non atteint', "branche IF non prise, ou nœud désactivé"],
  ];
  execStates.forEach(([color, t, d], i) => {
    const x = M + i * (EXW + 0.3);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 4.2, w: EXW, h: 1.5, fill: { color: LIGHT }, line: NOLINE, rectRadius: 0.1,
    });
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.24, y: 4.4, w: 0.3, h: 0.3, fill: { color: color }, line: NOLINE,
    });
    s.addText(fr(t), {
      x: x + 0.66, y: 4.4, w: EXW - 0.9, h: 0.3, margin: 0, valign: 'middle',
      fontFace: H, fontSize: 15, bold: true, color: TEXT,
    });
    s.addText(fr(d), {
      x: x + 0.24, y: 4.85, w: EXW - 0.48, h: 0.75, margin: 0,
      fontFace: B, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.2,
    });
  });

  callout(
    s, M, 5.95, CW, 0.75,
    'Le piège vécu en direct',
    "Claude · Rapprochement désactivé → Décider reçoit des données qu'il n'attend pas → erreur. Un nœud désactivé en amont peut casser un nœud en aval.",
    { titleSize: 14, bodySize: 11.5 },
  );

  s.addNotes(
    "- Slide optionnelle : utile si quelqu'un demande ce que signifient les couleurs dans Executions\n" +
    "- Exemple concret vecu : Claude desactive a casse Decider plus loin dans le workflow, erreur visible en rouge dans Executions"
  );
  footer(s, 'Les états d’un nœud', 14);
}

// =========================================================================
// 15 - Les noeuds du workflow (1/2)
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'POUR ALLER PLUS LOIN');

  s.addText(fr('Les nœuds du workflow (1/2)'), {
    x: M, y: 1.22, w: CW, h: 0.55, margin: 0,
    fontFace: H, fontSize: 28, bold: true, color: TEXT,
  });

  const nodes1 = [
    ['Webhook', "reçoit l'appel POST de git-sync, déclenche l'exécution"],
    ['Analyser le contexte', "extrait branche/commits, cherche un identifiant PAR-X"],
    ['Référence trouvée ?', "IF : un identifiant de ticket a-t-il été trouvé ?"],
    ['Linear · Ticket par référence', "récupère le ticket par son numéro exact"],
    ['Linear · Contexte équipe', "liste les tickets ouverts de l'équipe"],
    ['Préparer l’appel IA', "construit le prompt à envoyer à Claude"],
    ['Claude · Rapprochement', "demande à Claude de deviner le bon ticket"],
    ['Décider', "lit la réponse de Claude, applique le seuil 0,7"],
    ['Correspondance sûre ?', "IF : la confiance dépasse-t-elle le seuil ?"],
    ['Linear · Créer le ticket', "crée un ticket si rien ne correspond"],
    ['Normaliser le ticket', "unifie les 3 chemins en un seul format"],
  ];
  const NH = 0.44;
  nodes1.forEach(([t, d], i) => {
    const y = 1.92 + i * NH;
    s.addShape(pptx.ShapeType.ellipse, {
      x: M, y: y + 0.04, w: 0.26, h: 0.26, fill: { color: RED_DARK }, line: NOLINE,
    });
    s.addText(String(i + 1), {
      x: M, y: y + 0.04, w: 0.26, h: 0.26, margin: 0, align: 'center', valign: 'middle',
      fontFace: H, fontSize: 10.5, bold: true, color: WHITE,
    });
    s.addText(fr(t), {
      x: M + 0.42, y, w: 3.7, h: NH, margin: 0, valign: 'middle',
      fontFace: H, fontSize: 12.5, bold: true, color: RED_DARK,
    });
    s.addText(fr(d), {
      x: M + 4.2, y, w: CW - 4.2, h: NH, margin: 0, valign: 'middle',
      fontFace: B, fontSize: 11.5, color: TEXT,
    });
  });

  s.addNotes(
    "- Slide optionnelle : reference complete, a montrer seulement si quelqu'un veut le detail exact\n" +
    "- Les noeuds 4 a 11 sont les deux chemins (reference directe vs IA) qui convergent sur Normaliser le ticket"
  );
  footer(s, 'Les nœuds du workflow', 15);
}

// =========================================================================
// 16 - Les noeuds du workflow (2/2)
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'POUR ALLER PLUS LOIN');

  s.addText(fr('Les nœuds du workflow (2/2)'), {
    x: M, y: 1.22, w: CW, h: 0.55, margin: 0,
    fontFace: H, fontSize: 28, bold: true, color: TEXT,
  });

  const nodes2 = [
    ['Linear · État In Progress', "récupère l'identifiant de l'état In Progress"],
    ['Linear · Passer en In Progress', "change le statut du ticket"],
    ['Linear · Ajouter le commentaire', "poste le commentaire listant les commits"],
    ['Réponse', "renvoie la réponse HTTP à git-sync"],
    ['Mot-clé Done présent ?', "IF : closes-all est-il dans un commit ?"],
    ['Décider Done (tests réels)', "lit testResults, décide si tout est passé"],
    ['Tous les tests passent ?', "IF : le résultat des tests est-il au complet ?"],
    ['Linear · État Done', "récupère l'identifiant de l'état Done"],
    ['Linear · Passer en Done', "change le statut du ticket en Done"],
    ['Linear · Commentaire Done', "poste le récapitulatif des tests"],
  ];
  const NH = 0.44;
  nodes2.forEach(([t, d], i) => {
    const y = 1.92 + i * NH;
    s.addShape(pptx.ShapeType.ellipse, {
      x: M, y: y + 0.04, w: 0.26, h: 0.26, fill: { color: RED_DARK }, line: NOLINE,
    });
    s.addText(String(i + 12), {
      x: M, y: y + 0.04, w: 0.26, h: 0.26, margin: 0, align: 'center', valign: 'middle',
      fontFace: H, fontSize: 10.5, bold: true, color: WHITE,
    });
    s.addText(fr(t), {
      x: M + 0.42, y, w: 3.7, h: NH, margin: 0, valign: 'middle',
      fontFace: H, fontSize: 12.5, bold: true, color: RED_DARK,
    });
    s.addText(fr(d), {
      x: M + 4.2, y, w: CW - 4.2, h: NH, margin: 0, valign: 'middle',
      fontFace: B, fontSize: 11.5, color: TEXT,
    });
  });

  s.addNotes(
    "- Slide optionnelle : suite de la reference complete\n" +
    "- Noeuds 16 a 20 : le mecanisme Done, independant du chemin 1 a 11 emprunte plus haut\n" +
    "- Noeud 21 (Decider Done) ne fait aucun appel reseau, il lit juste testResults deja recu de git-sync"
  );
  footer(s, 'Les nœuds du workflow', 16);
}

// =========================================================================
// 10 - Architecture
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'CE QUI TOURNE DERRIÈRE');

  s.addText(fr('Les acteurs, de bout en bout'), {
    x: M, y: 1.22, w: CW, h: 0.66, margin: 0,
    fontFace: H, fontSize: 36, bold: true, color: TEXT,
  });

  const GAP = 0.25;
  const BW = (CW - 4 * GAP) / 5; // 2.186
  const ROW1_Y = 1.98;
  const ROW1_H = 1.55;
  const boxes = [
    { t: 'Développeur', d: 'Ecrit le code, commite\n(+ closes-all si le\nticket est termine)', fill: LIGHT, fg: TEXT, sub: MUTED },
    { t: 'git-sync', d: 'Lit les commits, lance\nles tests en local si besoin,\nenvoie tout a n8n', fill: LIGHT, fg: TEXT, sub: MUTED },
    { t: 'n8n', d: 'Reçoit l’appel et\nexécute les 21 nœuds\npour décider quoi faire', fill: RED_DARK, fg: WHITE, sub: 'FFD9E2' },
    { t: 'Claude', d: 'Appelé seulement si\naucune référence trouvée\ndans la branche', fill: LIGHT, fg: TEXT, sub: MUTED },
    { t: 'Linear', d: 'Reçoit la décision :\nstatut + commentaire\nsur le ticket', fill: DARK, fg: WHITE, sub: 'C9CAE0' },
  ];
  boxes.forEach((b, i) => {
    const x = M + i * (BW + GAP);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: ROW1_Y, w: BW, h: ROW1_H, fill: { color: b.fill }, line: NOLINE, rectRadius: 0.12,
    });
    s.addText(b.t, {
      x: x + 0.18, y: ROW1_Y + 0.18, w: BW - 0.36, h: 0.4, margin: 0,
      fontFace: H, fontSize: 18, bold: true, color: b.fg,
    });
    s.addText(fr(b.d), {
      x: x + 0.18, y: ROW1_Y + 0.6, w: BW - 0.36, h: 0.9, margin: 0,
      fontFace: B, fontSize: 11.5, color: b.sub, lineSpacingMultiple: 1.15,
    });
    if (i < 4) {
      s.addShape(pptx.ShapeType.rect, {
        x: x + BW + 0.04, y: ROW1_Y + ROW1_H / 2 - 0.018, w: GAP - 0.08, h: 0.035,
        fill: { color: RED }, line: NOLINE,
      });
    }
  });

  // Satellites : les deux bases de donnees du systeme, chacune sous son proprietaire.
  const ROW2_Y = ROW1_Y + ROW1_H + 0.45;
  const ROW2_H = 1.0;
  const satellites = [
    { i: 0, t: 'Stockage en mémoire', d: 'Livres et auteurs,\nreinitialise au redemarrage\n(pas de base de donnees)' },
    { i: 1, t: 'Tests d’acceptation', d: 'npm test, execute en local\navant l’envoi (closes-all)\nresultat reel, pas une estimation' },
    { i: 2, t: 'Postgres', d: 'Etat interne de n8n :\nworkflows, executions,\ncredentials chiffrees' },
  ];
  satellites.forEach(({ i, t, d }) => {
    const x = M + i * (BW + GAP);
    s.addShape(pptx.ShapeType.rect, {
      x: x + BW / 2 - 0.018, y: ROW1_Y + ROW1_H, w: 0.036, h: 0.45,
      fill: { color: MUTED }, line: NOLINE,
    });
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: ROW2_Y, w: BW, h: ROW2_H, fill: { color: LIGHT }, line: NOLINE, rectRadius: 0.1,
    });
    s.addText(fr(t), {
      x: x + 0.16, y: ROW2_Y + 0.12, w: BW - 0.32, h: 0.3, margin: 0,
      fontFace: H, fontSize: 13, bold: true, color: RED_DARK,
    });
    s.addText(fr(d), {
      x: x + 0.16, y: ROW2_Y + 0.42, w: BW - 0.32, h: 0.55, margin: 0,
      fontFace: B, fontSize: 10, color: MUTED, lineSpacingMultiple: 1.1,
    });
  });

  callout(
    s, M, ROW2_Y + ROW2_H + 0.25, CW, 1.1,
    'Tout est local, sauf deux appels',
    "n8n et Postgres tournent en Docker sur la machine, le script appelle localhost. Seuls Linear et Anthropic sont des appels sortants. Le passage en Done s'appuie sur de vrais tests exécutés en local, jamais sur une estimation de Claude, qui ne voit de toute façon jamais le code.",
    { titleSize: 16, bodySize: 12.5 },
  );
  s.addNotes(
    "- Parcourir chaque boite de gauche a droite en nommant l'action qui s'y passe\n" +
    "- Insister sur \"tout est local sauf deux appels sortants\" pour rassurer sur la confidentialite\n" +
    "- Mentionner que Claude ne voit jamais le code, seulement des noms de fichiers et messages de commit"
  );
  footer(s, 'Architecture', 17);
}

// =========================================================================
// 9 - Ce que ca coute
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: WHITE };
  kicker(s, 'LE COÛT');

  s.addText(fr('Ce que ça coûte'), {
    x: M, y: 1.30, w: CW, h: 0.78, margin: 0,
    fontFace: H, fontSize: 40, bold: true, color: TEXT,
  });

  const GAP = 0.5;
  const TW = (CW - 3 * GAP) / 4; // 2.608
  const stats = [
    ['21', 'nœuds', 50],
    ['0', 'ligne déployée', 50],
    ['1', 'soirée de travail', 50],
    ['Abonnement', 'hébergement sur serveur', 23],
  ];
  stats.forEach(([n, t, fs], i) => {
    const x = M + i * (TW + GAP);
    const hot = i === 3;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.4, w: TW, h: 1.95, fill: { color: hot ? RED : LIGHT }, line: NOLINE, rectRadius: 0.12,
    });
    s.addText(n, {
      x: x + 0.24, y: 2.66, w: TW - 0.48, h: 0.95, margin: 0,
      fontFace: H, fontSize: fs, bold: true, color: hot ? WHITE : RED,
    });
    s.addText(fr(t), {
      x: x + 0.24, y: 3.64, w: TW - 0.48, h: 0.5, margin: 0,
      fontFace: B, fontSize: 15, bold: hot, color: hot ? WHITE : MUTED, lineSpacingMultiple: 1.1,
    });
  });

  callout(
    s, M, 4.76, CW, 1.36,
    'La licence',
    "n8n est en fair-code. L'auto-hébergement est gratuit et illimité pour un usage interne ; seule la revente en tant que service est interdite.",
  );
  s.addNotes(
    "- Donner les chiffres sans s'excuser, assumer que c'est peu cher\n" +
    "- Si quelqu'un s'inquiete de la legalite : mentionner la licence fair-code de n8n"
  );
  footer(s, 'Ce que ça coûte', 18);
}

// =========================================================================
// 11 - Cloture
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: DARK };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: HGT, fill: { color: RED }, line: NOLINE });

  s.addText('CE QUI RESTE À DÉCIDER', {
    x: M + 0.25, y: 1.2, w: 8, h: 0.35, margin: 0,
    fontFace: B, fontSize: 14, bold: true, color: RED, charSpacing: 5,
  });
  s.addText(fr('On le met sur un serveur,\nou il reste sur mon portable ?'), {
    x: M + 0.25, y: 1.8, w: 11, h: 1.6, margin: 0,
    fontFace: H, fontSize: 40, bold: true, color: WHITE, lineSpacingMultiple: 1.1,
  });

  const LX = M + 0.75; // debut des libelles
  const DX = 4.3; // debut des descriptions, colonne resserree
  const points = [
    ['Un abonnement', 'un VPS, configuration de sécurité documentée'],
    ['Export versionné', 'le workflow vit dans le dépôt, pas dans une machine'],
    ['Validation humaine', 'à activer si la création automatique de tickets gêne'],
  ];
  points.forEach(([t, d], i) => {
    const y = 3.7 + i * 0.86;
    node(s, M + 0.25, y + 0.06, { w: 0.26, h: 0.26 });
    s.addText(fr(t), {
      x: LX, y, w: DX - LX - 0.3, h: 0.4, margin: 0, valign: 'middle',
      fontFace: H, fontSize: 18, bold: true, color: WHITE,
    });
    s.addText(fr(d), {
      x: DX, y, w: RIGHT - DX, h: 0.4, margin: 0, valign: 'middle',
      fontFace: B, fontSize: 15, color: 'C9CAE0',
    });
  });

  s.addText(fr('Les questions maintenant, les détails techniques après.'), {
    x: M + 0.25, y: 6.25, w: 11, h: 0.4, margin: 0,
    fontFace: B, fontSize: 14, color: MUTED_DARK, italic: true,
  });
  s.addNotes(
    "- Poser la vraie question de decision a la salle, ne pas trancher soi-meme\n" +
    "- Laisser le chef de projet reagir en premier"
  );
  footer(s, 'Clôture', 19, { mode: 'dark', x: M + 0.25 });
}

// =========================================================================
// 14 - Merci
// =========================================================================
{
  const s = pptx.addSlide();
  s.background = { color: DARK };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: HGT, fill: { color: RED }, line: NOLINE });

  s.addText('Merci', {
    x: M + 0.25, y: 2.5, w: 11, h: 1.6, margin: 0,
    fontFace: H, fontSize: 80, bold: true, color: WHITE,
  });
  s.addText(fr('git → Linear, avec n8n en local'), {
    x: M + 0.25, y: 4.1, w: 10, h: 0.5, margin: 0,
    fontFace: B, fontSize: 20, color: 'C9CAE0',
  });

  nodeChain(s, M + 0.25, 5.3, 5);

  s.addNotes(
    "- Remercier, ouvrir les questions\n" +
    "- Rappeler que les details techniques sont dispo apres pour qui veut creuser"
  );
  footer(s, 'Merci', 20, { mode: 'dark', x: M + 0.25 });
}

pptx.writeFile({ fileName: 'n8n-git-linear.pptx' }).then(() => {
  console.log('OK : presentation/n8n-git-linear.pptx (20 slides)');
});
