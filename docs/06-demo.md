# 06 — Dérouler la présentation

Public : l'équipe de développement et le chef de projet.

> **Démo concrète à jour** : ce document décrit la structure générale (la logique du
> déroulé). Pour le script précis avec les commandes exactes — tickets `PAR-8`/`PAR-9`,
> mécanisme de passage en Done via de vrais tests (`closes-all`) — utilise
> `presentation/notes-presentateur.html` (notes complètes + pense-bête de commandes) et
> le deck `presentation/n8n-git-linear.pptx`. C'est la source à jour ; ce document reste
> un gabarit générique si tu rejoues la démo avec un autre exemple.

Le principe qui guide tout le déroulé : **montrer la douleur avant l'outil**. Une démo
d'automatisation qui commence par « voici n8n » perd la salle ; une démo qui commence par
« voici ce qu'on fait tous à la main » la garde.

---

## Préparation matérielle

- [ ] `docker compose ps` : les deux conteneurs tournent
- [ ] Le workflow est **Published/activé** dans n8n
- [ ] Trois onglets ouverts : n8n, Linear (vue board), le terminal
- [ ] Terminal en gros caractères, thème clair si le projecteur est pâle
- [ ] `unset N8N_WEBHOOK_URL`
- [ ] `./setup-demo-book-crud.sh` lancé une fois (recrée les fichiers de démo non
      committés — voir `presentation/notes-presentateur.html`)
- [ ] Les tickets de démo prêts en **Backlog** dans Linear
- [ ] Les branches de démo créées à l'avance, commits inclus — tu ne veux pas taper du
      code devant la salle
- [ ] Wifi vérifié : Linear et Anthropic sont des appels sortants

---

## Minute par minute (structure générique)

### La douleur

Ouvre le board Linear. Pose la question à la salle :

> « Ce board reflète-t-il ce sur quoi on travaille en ce moment ? »

Laisse le silence répondre. Enchaîne :

> « Trois tickets sont en Todo alors que le code est déjà écrit. Ce n'est pas de la
> négligence : c'est que déplacer une carte n'apporte rien à celui qui la déplace. »

Tu viens de nommer un problème que le chef de projet vit et que les devs subissent.

### La promesse

> « On va faire en sorte que le board se mette à jour tout seul, à partir de la seule
> chose qu'un dev fait toujours : commiter. »

Pas de slide d'architecture ici. Montre le résultat d'abord.

### Démo 1 — le cas simple

Terminal (commandes exactes : `presentation/notes-presentateur.html`) :

```bash
git log --oneline -3
git-sync
```

Bascule sur Linear, rafraîchis : le ticket est passé en In Progress, avec le commentaire
listant les commits.

> « Aucune IA ici. Le nom de la branche contenait l'identifiant du ticket, n8n a fait le
> reste. »

Ce cadrage compte : tu montres que la base fonctionne sans magie, ce qui rend la suite
crédible.

### Démo 2 — le suivi continu

> « Un commit qui référence le ticket ne le ferme jamais tout seul. »

Deux commits successifs sur le même ticket, chacun suivi d'un `git-sync` : le statut
reste en In Progress, mais un nouveau commentaire s'ajoute à chaque fois.

> « Le ticket accumule l'historique. Rien ne bouge tant que le développeur ne le décide
> pas explicitement. »

### Démo 3 — le passage en Done

```bash
git commit -m "... (closes-all)"
git-sync
```

> « Ce mot-clé déclenche de vrais tests, exécutés en local, avant même que quoi que ce
> soit parte vers n8n. S'ils passent tous, le ticket bascule en Done tout seul — sinon,
> rien ne bouge. Jamais une estimation, toujours un résultat réel. »

C'est le moment le plus fort de la démo : montrer que l'automatisation ne devine jamais,
elle vérifie.

> Si Claude est connecté le jour J, tu peux aussi montrer le chemin de rapprochement IA
> (branche sans référence, Claude propose un ticket, seuil de confiance à 0,7) — c'est un
> chemin alternatif du workflow, indépendant du mécanisme Done ci-dessus.

### Ce que ça coûte

Ouvre le workflow entier, dézoomé.

> « 21 nœuds, aucune ligne de code déployée, une soirée de travail. n8n tourne sur ma
> machine, gratuitement — la licence n'interdit que la revente du produit. »

Puis la suite logique :

> « Pour que ça serve à toute l'équipe, il faut un serveur : un abonnement mensuel, plus
> une configuration de sécurité que j'ai documentée. »

Tu passes de la démo à une proposition chiffrée. C'est ce que le chef de projet attend.

### Questions

---

## Les questions qui viendront

**« Le passage en Done, c'est fiable ? »**
Ce n'est pas une estimation : de vrais tests tournent en local, sur la machine du
développeur, avant même que quoi que ce soit parte vers n8n. n8n lit un résultat réel
(pass/fail), jamais une supposition.

**« N'importe qui peut écrire closes-all et forcer un Done ? »**
Non : il faut en plus que les tests réels passent à 100 %. Double verrou — un geste
volontaire du développeur, plus une vérification réelle.

**« Et si l'IA se trompe de ticket ? »** *(si le chemin de rapprochement IA est démontré)*
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
Les messages de commit et les noms de fichiers, oui. Jamais le code. Si c'est bloquant,
le rapprochement par référence directe fonctionne seul, sans aucun appel IA.

---

## À éviter

- Taper du code en direct : prépare les branches à l'avance
- Ouvrir l'éditeur n8n avant d'avoir montré un résultat
- Promettre que ça marche à tous les coups — montre les garde-fous (seuil, mot-clé,
  tests réels), c'est plus solide
- Traîner en longueur : garde les détails techniques pour ceux qui viendront te voir après

---

Suite : [07 — Passer sur un serveur](07-vps.md)
