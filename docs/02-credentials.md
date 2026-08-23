# 02 — Identifiants : Linear et Anthropic

Le workflow appelle deux API. Chacune a besoin d'un identifiant enregistré dans n8n.

Durée : environ 10 minutes.

---

## 2.1 Clé API Linear

1. Ouvre Linear → **Settings** → **Security & access** → **Personal API keys**
2. **New API key**, nomme-la `n8n-git-sync`
3. Copie la clé immédiatement — Linear ne la réaffiche jamais

### Enregistrer la clé dans n8n

Dans n8n : menu latéral → **Credentials** → **Add credential**.

| Champ | Valeur |
|---|---|
| Type d'identifiant | **Linear API** |
| Nom | `Linear` |
| Authentication | `API Token` |
| API Token | la clé copiée |

**Save**, puis **Test** : n8n doit afficher « Connection tested successfully ».

### Repérer ta clé d'équipe

Dans Linear, l'identifiant d'un ticket ressemble à `ALO-42`. Le préfixe `ALO` est la
**clé d'équipe** — c'est elle que le workflow utilise pour retrouver les tickets.

Note la clé de l'équipe sur laquelle tu vas faire la démo. Crée une équipe dédiée
(**Settings → Teams → New team**) si tu ne veux pas toucher au vrai board.

---

## 2.2 Clé API Anthropic

1. Va sur <https://console.anthropic.com> → **API Keys** → **Create Key**
2. Copie la clé (elle commence par `sk-ant-`)
3. Vérifie que ton organisation a du crédit : **Billing**. Quelques dollars suffisent
   largement — un appel de ce workflow coûte de l'ordre du centime.

### Enregistrer la clé dans n8n

L'API Anthropic attend la clé dans un en-tête `x-api-key`. On utilise donc un
identifiant générique de type en-tête.

**Credentials** → **Add credential** → **Header Auth**.

| Champ | Valeur |
|---|---|
| Nom | `Anthropic` |
| Name | `x-api-key` |
| Value | ta clé `sk-ant-...` |

**Save**. Ce type d'identifiant n'a pas de bouton de test — on le validera au premier
appel du workflow.

---

## 2.3 Vérification manuelle des deux API

Avant de construire le workflow, confirme que les deux clés fonctionnent depuis ton
terminal. Si l'une échoue ici, elle échouera aussi dans n8n, et c'est bien plus rapide
à diagnostiquer maintenant.

### Linear

```bash
export LINEAR_KEY="colle_ta_cle_ici"

curl -sS https://api.linear.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_KEY" \
  -d '{"query":"{ viewer { name email } teams { nodes { key name } } }"}' | jq .
```

Tu dois voir ton nom et la liste de tes équipes avec leurs clés.

### Anthropic

```bash
export ANTHROPIC_KEY="colle_ta_cle_ici"

curl -sS https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-opus-5",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Reponds uniquement : OK"}]
  }' | jq -r '.content[0].text'
```

Tu dois lire `OK`.

Une erreur `authentication_error` signifie que la clé est mauvaise ; une erreur
`credit balance is too low` signifie qu'il faut recharger le compte.

> Ferme ce terminal ensuite, ou lance `unset LINEAR_KEY ANTHROPIC_KEY` : ces variables
> ne doivent pas traîner dans ton historique de session.

---

Suite : [03 — Construire le workflow](03-workflow.md)
