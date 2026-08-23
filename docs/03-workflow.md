# 03 — Construire le workflow, nœud par nœud

15 nœuds. Compte 1 h 30 la première fois.

Si tu préfères aller vite, importe `workflows/git-linear-sync.json`
(menu `⋯` en haut à droite → **Import from File**) et lis quand même ce document pour
comprendre ce que fait chaque nœud — c'est ce que tu devras expliquer pendant la
présentation.

---

## Vue d'ensemble

```
Webhook
  └─ Analyser le contexte                    (Code)
       └─ Référence trouvée ?                (IF)
            ├─ oui → Linear · Ticket par référence ───────────────┐
            └─ non → Linear · Contexte équipe                     │
                       └─ Préparer l'appel IA                     │
                            └─ Claude · Rapprochement             │
                                 └─ Décider                       │
                                      └─ Correspondance sûre ?    │
                                           ├─ oui ────────────────┤
                                           └─ non → Créer le ticket
                                                                  │
                            Normaliser le ticket  ◄───────────────┘
                                 └─ Linear · État In Progress
                                      └─ Linear · Passer en In Progress
                                           └─ Linear · Ajouter le commentaire
                                                └─ Réponse
```

Deux chemins mènent au même endroit : soit tes commits nomment déjà le ticket, soit
l'IA le retrouve — ou le crée. À partir de « Normaliser le ticket », le traitement est
identique.

---

## Créer le workflow

**Overview** → **Create Workflow**. Renomme-le `git → Linear` en haut à gauche.

Ajoute chaque nœud avec la touche **Tab** ou le bouton **+**, puis relie-les en tirant
un trait entre les points de connexion.

---

## Nœud 1 — `Webhook`

Recherche `Webhook`.

| Paramètre | Valeur |
|---|---|
| HTTP Method | `POST` |
| Path | `git-sync` |
| Respond | `Using 'Respond to Webhook' Node` |

Deux URL apparaissent :

- **Test URL** — `http://localhost:5678/webhook-test/git-sync`, active seulement pendant
  que tu cliques sur *Listen for test event*. C'est celle que tu utiliseras pour mettre
  au point.
- **Production URL** — `http://localhost:5678/webhook/git-sync`, active dès que le
  workflow est activé. C'est celle du script.

---

## Nœud 2 — `Analyser le contexte` (Code)

Recherche `Code`. Renomme le nœud **exactement** `Analyser le contexte` : d'autres nœuds
le référencent par son nom.

Mode : `Run Once for All Items`. Langage : `JavaScript`.

```javascript
// La charge utile arrive sous .body quand le webhook recoit du JSON en POST.
const body = $input.first().json.body ?? $input.first().json;

// Equipe Linear utilisee quand le depot n'en declare aucune.
const DEFAULT_TEAM_KEY = 'ALO';

const teamKey = String(body.teamKey || DEFAULT_TEAM_KEY).toUpperCase();
const commits = Array.isArray(body.commits) ? body.commits : [];

// Un identifiant Linear peut apparaitre dans le nom de branche ou dans un message.
const haystack = [body.branch || '', ...commits.map(c => c.subject || '')].join(' ');
const match = haystack.match(new RegExp('\\b' + teamKey + '-(\\d+)\\b', 'i'));

const commitsText = commits
  .map(c => '- ' + String(c.sha).slice(0, 7) + ' ' + c.subject)
  .join('\n');

const filesText = (body.files || []).slice(0, 40).join('\n');

return [{
  json: {
    repo: body.repo || 'inconnu',
    branch: body.branch || 'inconnue',
    author: body.author || 'inconnu',
    stat: body.stat || '',
    teamKey,
    hasRef: Boolean(match),
    issueNumber: match ? Number(match[1]) : null,
    issueIdentifier: match ? teamKey + '-' + match[1] : null,
    commits,
    commitsText,
    filesText,
  },
}];
```

> Remplace `'ALO'` par la clé de ton équipe Linear. Le script peut la surcharger dépôt
> par dépôt ; cette constante est le filet de sécurité.

---

## Nœud 3 — `Référence trouvée ?` (IF)

Recherche `If`.

| Champ | Valeur |
|---|---|
| Value 1 | `{{ $json.hasRef }}` (glisse le champ depuis le panneau de gauche) |
| Type de condition | `Boolean` |
| Operation | `is true` |

La sortie **true** partira vers le nœud 4, la sortie **false** vers le nœud 5.

---

## Nœud 4 — `Linear · Ticket par référence` (HTTP Request)

Branché sur la sortie **true** du nœud 3.

| Paramètre | Valeur |
|---|---|
| Method | `POST` |
| URL | `https://api.linear.app/graphql` |
| Authentication | `Predefined Credential Type` |
| Credential Type | `Linear API` |
| Credential | `Linear` |
| Send Body | activé |
| Body Content Type | `JSON` |
| Specify Body | `Using JSON` |

JSON (bascule le champ en mode expression avec l'icône `=`) :

```
{{ JSON.stringify({
  query: 'query($number: Float!, $teamKey: String!) { issues(filter: { number: { eq: $number }, team: { key: { eq: $teamKey } } }, first: 1) { nodes { id identifier title url state { id name } } } }',
  variables: { number: $json.issueNumber, teamKey: $json.teamKey }
}) }}
```

Ce nœud interroge Linear par numéro **et** par équipe : `ALO-42` et `WEB-42` ne se
confondent pas.

Relie sa sortie au nœud 11 (`Normaliser le ticket`) — tu le créeras plus tard, reviens
brancher ce fil à ce moment-là.

---

## Nœud 5 — `Linear · Contexte équipe` (HTTP Request)

Branché sur la sortie **false** du nœud 3.

Mêmes réglages d'authentification que le nœud 4. JSON :

```
{{ JSON.stringify({
  query: 'query($teamKey: String!) { teams(filter: { key: { eq: $teamKey } }, first: 1) { nodes { id key name } } issues(filter: { team: { key: { eq: $teamKey } }, state: { type: { nin: ["completed", "canceled"] } } }, first: 50) { nodes { id identifier title description url } } }',
  variables: { teamKey: $json.teamKey }
}) }}
```

Une seule requête ramène l'identifiant de l'équipe (nécessaire pour créer un ticket) et
les 50 tickets encore ouverts (le catalogue que l'IA va lire).

---

## Nœud 6 — `Préparer l'appel IA` (Code)

Nomme-le **exactement** `Préparer l'appel IA`. Mode `Run Once for All Items`.

```javascript
const ctx = $('Analyser le contexte').first().json;
const data = $input.first().json.data || {};
const issues = (data.issues && data.issues.nodes) || [];
const team = (data.teams && data.teams.nodes && data.teams.nodes[0]) || null;

const catalogue = issues.map(i => '- ' + i.identifier + ' : ' + i.title).join('\n')
  || '(aucun ticket ouvert)';

const prompt = [
  'Tu relies un lot de commits git a un ticket Linear.',
  '',
  'Depot : ' + ctx.repo,
  'Branche : ' + ctx.branch,
  '',
  'Commits :',
  ctx.commitsText,
  '',
  'Fichiers modifies :',
  ctx.filesText,
  '',
  "Tickets ouverts de l'equipe " + ctx.teamKey + ' :',
  catalogue,
  '',
  'Mets dans match_identifier l identifiant du ticket qui correspond vraiment a ce',
  'travail, ou null si aucun ne correspond. confidence exprime ta certitude entre 0 et 1 :',
  'reste sous 0.7 des qu un doute serieux existe.',
  'Quand aucun ticket ne correspond, propose dans suggested_title et',
  'suggested_description le ticket a creer : titre court en francais, description en',
  "markdown resumant l intention du travail.",
].join('\n');

// Le schema force la reponse a etre du JSON exploitable, jamais de la prose.
const schema = {
  type: 'object',
  properties: {
    match_identifier: { type: ['string', 'null'] },
    confidence: { type: 'number' },
    reason: { type: 'string' },
    suggested_title: { type: 'string' },
    suggested_description: { type: 'string' },
  },
  required: ['match_identifier', 'confidence', 'reason', 'suggested_title', 'suggested_description'],
  additionalProperties: false,
};

return [{
  json: {
    teamId: team ? team.id : null,
    issues,
    anthropicBody: {
      model: 'claude-opus-5',
      max_tokens: 2000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: prompt }],
    },
  },
}];
```

> `effort: 'low'` garde la réponse rapide — important quand une salle te regarde. Le
> schéma `json_schema` est ce qui rend le nœud suivant fiable : la réponse est du JSON
> valide, garanti, pas un paragraphe qu'il faudrait parser à la main.

---

## Nœud 7 — `Claude · Rapprochement` (HTTP Request)

| Paramètre | Valeur |
|---|---|
| Method | `POST` |
| URL | `https://api.anthropic.com/v1/messages` |
| Authentication | `Generic Credential Type` |
| Generic Auth Type | `Header Auth` |
| Credential | `Anthropic` |
| Send Headers | activé |
| Header — Name | `anthropic-version` |
| Header — Value | `2023-06-01` |
| Send Body | activé |
| Body Content Type | `JSON` |
| Specify Body | `Using JSON` |

JSON :

```
{{ JSON.stringify($json.anthropicBody) }}
```

Tout le corps de la requête a été construit dans le nœud précédent : ce nœud ne fait
que l'envoyer.

---

## Nœud 8 — `Décider` (Code)

Nomme-le **exactement** `Décider`.

```javascript
const prep = $("Préparer l'appel IA").first().json;
const response = $input.first().json;

const text = (response.content || [])
  .filter(b => b.type === 'text')
  .map(b => b.text)
  .join('');

let verdict;
try {
  verdict = JSON.parse(text);
} catch (error) {
  throw new Error('Reponse IA illisible : ' + text.slice(0, 300));
}

// En dessous de ce seuil, on ne touche a aucun ticket existant.
const SEUIL = 0.7;

const issue = verdict.match_identifier
  ? prep.issues.find(i => i.identifier === verdict.match_identifier) || null
  : null;

return [{
  json: {
    sure: Boolean(issue) && verdict.confidence >= SEUIL,
    confidence: verdict.confidence,
    reason: verdict.reason,
    issue,
    teamId: prep.teamId,
    suggestedTitle: verdict.suggested_title,
    suggestedDescription: verdict.suggested_description,
  },
}];
```

Le seuil est le garde-fou de tout le workflow. L'IA propose, ce nœud décide.

---

## Nœud 9 — `Correspondance sûre ?` (IF)

| Champ | Valeur |
|---|---|
| Value 1 | `{{ $json.sure }}` |
| Type | `Boolean` |
| Operation | `is true` |

**true** → nœud 11. **false** → nœud 10.

---

## Nœud 10 — `Linear · Créer le ticket` (HTTP Request)

Mêmes réglages Linear que le nœud 4. JSON :

```
{{ JSON.stringify({
  query: 'mutation($teamId: String!, $title: String!, $description: String!) { issueCreate(input: { teamId: $teamId, title: $title, description: $description }) { success issue { id identifier title url } } }',
  variables: { teamId: $json.teamId, title: $json.suggestedTitle, description: $json.suggestedDescription }
}) }}
```

---

## Nœud 11 — `Normaliser le ticket` (Code)

Trois nœuds y arrivent : le 4, la sortie **true** du 9, et le 10. Chacun a une forme de
réponse différente ; ce nœud les ramène à une forme unique.

Nomme-le **exactement** `Normaliser le ticket`.

```javascript
const ctx = $('Analyser le contexte').first().json;
const input = $input.first().json;

let issue = null;
let created = false;
let confidence = null;
let reason = '';

if (input.data && input.data.issues && input.data.issues.nodes.length) {
  issue = input.data.issues.nodes[0];           // trouve par reference explicite
} else if (input.data && input.data.issueCreate) {
  issue = input.data.issueCreate.issue;         // cree a l instant
  created = true;
  const decision = $('Décider').first().json;
  confidence = decision.confidence;
  reason = decision.reason;
} else if (input.issue) {
  issue = input.issue;                          // rapproche par l IA
  confidence = input.confidence;
  reason = input.reason;
}

if (!issue) {
  throw new Error('Aucun ticket resolu pour la branche ' + ctx.branch);
}

const commentBody = [
  '**Synchronisation depuis `' + ctx.repo + '` — branche `' + ctx.branch + '`**',
  '',
  ctx.commitsText,
  '',
  ctx.stat ? '`' + ctx.stat.trim() + '`' : '',
  confidence !== null
    ? '_Rapprochement automatique, confiance ' + confidence + ' — ' + reason + '_'
    : '',
].filter(Boolean).join('\n');

const message = (created ? 'Nouveau ticket ' : 'Ticket ') + issue.identifier
  + ' -> In Progress (' + ctx.commits.length + ' commit(s))\n' + issue.url;

return [{
  json: {
    issueId: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
    teamKey: ctx.teamKey,
    created,
    commentBody,
    message,
  },
}];
```

---

## Nœud 12 — `Linear · État In Progress` (HTTP Request)

Les statuts Linear sont des UUID, pas des noms. On demande à Linear l'état de type
`started` de l'équipe — c'est « In Progress » quel que soit son libellé.

```
{{ JSON.stringify({
  query: 'query($teamKey: String!) { workflowStates(filter: { team: { key: { eq: $teamKey } }, type: { eq: "started" } }, first: 1) { nodes { id name } } }',
  variables: { teamKey: $json.teamKey }
}) }}
```

---

## Nœud 13 — `Linear · Passer en In Progress` (HTTP Request)

```
{{ JSON.stringify({
  query: 'mutation($id: String!, $stateId: String!) { issueUpdate(id: $id, input: { stateId: $stateId }) { success issue { identifier url state { name } } } }',
  variables: {
    id: $('Normaliser le ticket').first().json.issueId,
    stateId: $json.data.workflowStates.nodes[0].id
  }
}) }}
```

---

## Nœud 14 — `Linear · Ajouter le commentaire` (HTTP Request)

```
{{ JSON.stringify({
  query: 'mutation($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success } }',
  variables: {
    issueId: $('Normaliser le ticket').first().json.issueId,
    body: $('Normaliser le ticket').first().json.commentBody
  }
}) }}
```

---

## Nœud 15 — `Réponse` (Respond to Webhook)

| Paramètre | Valeur |
|---|---|
| Respond With | `JSON` |
| Response Body | expression ci-dessous |

```
{{ JSON.stringify({ message: $('Normaliser le ticket').first().json.message }) }}
```

C'est cette ligne que ton terminal affichera.

---

## Activer

Bascule l'interrupteur **Active** en haut à droite. La Production URL du webhook devient
joignable, et le script pourra l'appeler.

Suite : [04 — Le script `git-sync`](04-script-git-sync.md)
