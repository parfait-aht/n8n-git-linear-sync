# 06 — Dérouler la présentation

Public : l'équipe de développement et le chef de projet. Durée : 20 minutes, questions
comprises.

Le principe qui guide tout le déroulé : **montrer la douleur avant l'outil**. Une démo
d'automatisation qui commence par « voici n8n » perd la salle ; une démo qui commence par
« voici ce qu'on fait tous à la main » la garde.

---

## Préparation matérielle

- [ ] `docker compose ps` : les deux conteneurs tournent
- [ ] Le workflow est activé
- [ ] Trois onglets ouverts : n8n, Linear (vue board), le terminal
- [ ] Terminal en gros caractères, thème clair si le projecteur est pâle
- [ ] `unset N8N_WEBHOOK_URL`
- [ ] Un ticket `ALO-42` prêt en **Todo**, un ticket « export CSV » prêt en **Todo**
- [ ] Les branches de démo créées à l'avance, commits inclus — tu ne veux pas taper du
      code devant la salle
- [ ] Wifi vérifié : Linear et Anthropic sont des appels sortants

---

## Minute par minute

### 0 → 3 min — La douleur

Ouvre le board Linear. Pose la question à la salle :

> « Ce board reflète-t-il ce sur quoi on travaille en ce moment ? »

Laisse le silence répondre. Enchaîne :

> « Trois tickets sont en Todo alors que le code est déjà écrit. Ce n'est pas de la
> négligence : c'est que déplacer une carte n'apporte rien à celui qui la déplace. »

Tu viens de nommer un problème que le chef de projet vit et que les devs subissent.

### 3 → 5 min — La promesse

> « On va faire en sorte que le board se mette à jour tout seul, à partir de la seule
> chose qu'un dev fait toujours : commiter. »

Pas de slide d'architecture ici. Montre le résultat d'abord.

### 5 → 8 min — Démo 1, le cas simple

Terminal :

```bash
cd ~/demo-git-sync
git log --oneline -3
git-sync
```

Bascule sur Linear, rafraîchis : `ALO-42` est passé en In Progress, avec le commentaire
listant les commits.

> « Aucune IA ici. Le nom de la branche contenait l'identifiant du ticket, n8n a fait le
> reste. »

Ce cadrage compte : tu montres que la base fonctionne sans magie, ce qui rend la suite
crédible.

### 8 → 12 min — Démo 2, le cas réel

> « Sauf que personne ne met systématiquement l'identifiant du ticket dans le nom de
> branche. »

```bash
git checkout feature/export
git-sync
```

Pendant que ça tourne, passe sur n8n et montre le chemin qui s'allume. Ouvre le nœud
`Claude · Rapprochement` et lis la réponse à voix haute — l'identifiant retenu, le score
de confiance, la justification.

> « Le modèle propose. C'est le nœud suivant qui décide : en dessous de 0,7, on ne touche
> à rien. »

C'est le moment où les devs sceptiques décrochent ou embarquent. Insiste sur le seuil,
pas sur l'IA.

### 12 → 15 min — Démo 3, le garde-fou

```bash
git checkout chore/renommer-variables
git-sync
```

Un ticket est créé avec titre et description générés.

> « Ici aucun ticket ne correspondait. Le workflow en crée un — et c'est la décision la
> plus discutable de tout le système. Un board qui se remplit tout seul devient
> vite illisible. On peut très bien exiger une validation à cet endroit. »

Reconnaître la limite avant qu'on te la reproche désarme la critique et te positionne en
ingénieur, pas en vendeur.

### 15 → 18 min — Ce que ça coûte

Ouvre le workflow entier, dézoomé.

> « 21 nœuds, aucune ligne de code déployée, une soirée de travail. n8n tourne sur ma
> machine, gratuitement — la licence n'interdit que la revente du produit. »

Puis la suite logique :

> « Pour que ça serve à toute l'équipe, il faut un serveur : 5 € par mois, plus une
> configuration de sécurité que j'ai documentée. »

Tu passes de la démo à une proposition chiffrée. C'est ce que le chef de projet attend.

### 18 → 20 min — Questions

---

## Les questions qui viendront

**« Et si l'IA se trompe de ticket ? »**
Le seuil de confiance. En dessous de 0,7 rien n'est modifié. Et tout est réversible : un
changement de statut et un commentaire, rien de destructif.

**« Ça coûte combien en API ? »**
De l'ordre du centime par appel, et seulement quand la branche ne nomme pas le ticket.
Sur une équipe de cinq personnes, quelques euros par mois.

**« Pourquoi pas l'intégration GitHub native de Linear ? »**
Elle existe et elle est très bien — pour le cas où l'identifiant est déjà dans la
branche. Elle ne fait rien quand il n'y est pas, et c'est précisément le cas fréquent.
À dire spontanément : ça montre que tu connais l'alternative.

**« Qui maintient ça ? »**
Vraie question, réponds franchement. Un workflow n8n non maintenu est une dette. C'est
un argument pour le mettre sur un serveur partagé et versionner son export, pas pour le
laisser sur ton portable.

**« Et nos données partent chez Anthropic ? »**
Les messages de commit et les titres de tickets, oui. Pas le code. Si c'est bloquant,
le rapprochement par expression régulière fonctionne seul — on perd le cas 2.

---

## À éviter

- Taper du code en direct : prépare les branches à l'avance
- Ouvrir l'éditeur n8n avant d'avoir montré un résultat
- Promettre que ça marche à tous les coups — montre le seuil, c'est plus solide
- Dépasser 20 minutes : garde les détails techniques pour ceux qui viendront te voir après

---

Suite : [07 — Passer sur un serveur](07-vps.md)
