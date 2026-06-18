# Telefono pranešimai — diegimas (el. paštas + push)

Pranešimai („Pranešti visiems", priskirta veikla ir pan.) gali pasiekti telefoną
dviem kanalais. Abu siunčia **viena Supabase Edge Function `pranesti`**, kurią
paleidžia *Database Webhook*, kai į lentelę `pranesimai` įrašoma nauja eilutė.

| Kanalas | Kur statoma | Priklauso nuo Netlify? | Ką reikia susitvarkyti |
|---|---|---|---|
| **El. paštas** | Supabase (Edge Function + Resend) | **Ne** | Resend paskyra + siuntėjo domenas + API raktas |
| **Push (telefonas)** | Supabase + frontend (`sw.js`, `app.js`) | **Taip** (frontend turi pasiekti telefoną) | VAPID raktai + iPhone „į pradžios ekraną" |

> El. paštas gali veikti iškart (Netlify nereikia). Push pradės veikti, kai
> Netlify deploy atsinaujins (v26) ir žmonės programėlę pridės į pradžios ekraną.

---

## 1. Duomenų bazė

Supabase → **SQL Editor** → paleisk **`supabase/atnaujinimas-7.sql`**
(sukuria `push_subscriptions` lentelę ir `save_push_subscription` RPC).

## 2. Edge Function „pranesti"

Supabase → **Edge Functions** → **Deploy a new function** (arba „Create function").
Pavadinimas: **`pranesti`**. Įklijuok kodą iš
`supabase/functions/pranesti/index.ts` ir „Deploy".

> CLI alternatyva: `supabase functions deploy pranesti`.

## 3. „Secrets" (Edge Functions → Secrets / Settings)

`SUPABASE_URL` ir `SUPABASE_SERVICE_ROLE_KEY` įdedami **automatiškai** — jų rašyti nereikia.
Pridėk:

| Raktas | Reikšmė |
|---|---|
| `VAPID_KEYS` | JWKS JSON `{"publicKey":…,"privateKey":…}` — **žr. pokalbį** (NIEKADA necommitinti!) |
| `VAPID_SUBJECT` | `mailto:steam@vdu.lt` |
| `RESEND_API_KEY` | iš Resend (žr. 5 punktą) |
| `RESEND_FROM` | pvz. `VDU STEAM planas <pranesimai@tavo-domenas.lt>` |
| `WEBHOOK_SECRET` | (nebūtina) bet koks slaptas tekstas |

> `VAPID_KEYS` — visa JWKS eilutė įklijuojama kaip **viena** reikšmė. Viešas raktas
> naršyklei jau įdėtas `public/js/config.js` (`VAPID_PUBLIC_KEY`) — jo keisti nereikia.

## 4. Database Webhook

Supabase → **Database → Webhooks** → **Create a new hook**:

- **Table:** `public.pranesimai`
- **Events:** `Insert`
- **Type:** `Supabase Edge Functions` → funkcija **`pranesti`**
- (nebūtina) HTTP Headers: `x-webhook-secret` = ta pati `WEBHOOK_SECRET` reikšmė

Nuo šios akimirkos kiekvienas naujas pranešimas automatiškai keliauja į el. paštą / push.

## 5. El. paštas (Resend)

1. Susikurk paskyrą [resend.com](https://resend.com).
2. **Domenas:** norint siųsti **visai komandai**, reikia patvirtinto siuntėjo
   domeno (Resend → Domains → pridėk DNS įrašus domeno, kurį valdai).
   - Recipientai gali būti bet kokie (`@vdu.lt` ir t.t.) — patvirtinti reikia tik
     **siuntėjo** domeno.
   - Be domeno veikia tik `onboarding@resend.dev` ir **tik laiškams sau** (testui).
3. **API Keys** → sukurk raktą → įrašyk kaip `RESEND_API_KEY` (3 punktas).
4. `RESEND_FROM` nustatyk į adresą su patvirtintu domenu.

## 6. Push (telefonas)

1. **Frontend deploy:** v26 turi pasiekti telefoną — t.y. Netlify deploy turi būti
   atnaujintas (dabar pristabdytas dėl kredito limito).
2. **iPhone:** Safari → atidaryk svetainę → Bendrinti → **„Įtraukti į pradžios ekraną"**.
   Atidaryk programėlę per tą piktogramą (ne Safari tab'e!). Reikia **iOS 16.4+**.
3. Programėlėje: 🔔 varpelis → **„Įjungti pranešimus telefone"** → leisk pranešimus.
   - **Android / Chrome:** veikia ir iš naršyklės, bet geriau irgi „įdiegti" PWA.

## 7. Testas

Supabase SQL Editor:

```sql
insert into public.pranesimai (darbuotojas_id, tekstas, vaizdas)
select id, 'TESTAS 🔔 ar ateina į telefoną?', 'darbai'
from public.darbuotojai where aktyvus = true;
```

Turi ateiti: el. laiškas (jei sutvarkytas Resend) ir push (jei įjungtas įrenginyje).
Edge Function logus matysi: Supabase → Edge Functions → `pranesti` → **Logs**
(`{"email":"sent","push":1,...}`).

Išvalymas po testo (nebūtina): `delete from public.pranesimai where tekstas like 'TESTAS%';`
