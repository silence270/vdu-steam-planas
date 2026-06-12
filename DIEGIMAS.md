# Paleidimas internete (~10 minučių)

Sistema jau veikia demo režimu. Kad atsirastų tikri prisijungimai ir bendri
duomenys visiems, reikia dviejų nemokamų paskyrų: **Supabase** (duomenų bazė)
ir **Netlify** (svetainės talpinimas). Viskas žemiau — žingsnis po žingsnio.

## 1. Supabase (duomenų bazė ir prisijungimai)

1. Eikite į <https://supabase.com> → **Start your project** → registruokitės
   (tinka Google arba el. paštas).
2. **New project**: pavadinimas pvz. `steam-planas`, regionas — **Frankfurt
   (eu-central-1)**, sugalvokite duomenų bazės slaptažodį (užsirašykite, bet
   kasdien jo nereikės). Palaukite ~2 min, kol projektas susikurs.
3. Kairėje pasirinkite **SQL Editor** → **New query** → įklijuokite VISĄ failo
   `supabase/schema.sql` turinį → **Run**. Turi parašyti „Success“.
   Tai sukuria lenteles, saugumo taisykles ir visą 15 žmonių komandą.
4. Ten pat, SQL Editor, paleiskite dar vieną užklausą — įrašykite SAVO el.
   paštą prie savo profilio (pakeiskite adresą į tikrą):

   ```sql
   update darbuotojai set email = 'jusu.pastas@vdu.lt'
   where vardas = 'Gabrielius Plungė';
   ```

5. Kairėje **Authentication → Sign In / Providers → Email** → išjunkite
   **Confirm email** → Save. (Kitaip komanda negalės registruotis be pašto
   patvirtinimo.)
6. Kairėje apačioje **Project Settings → API**: nusikopijuokite du dalykus —
   **Project URL** ir **anon public** raktą.
7. Atidarykite failą `js/config.js` ir įklijuokite juos į kabutes:

   ```js
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi...",
   ```

   (Arba tiesiog atsiųskite abu man — įrašysiu aš.)

## 2. Netlify (svetainės talpinimas)

1. Eikite į <https://app.netlify.com> → registruokitės nemokamai.
2. **Add new site → Deploy manually** ir įtempkite VISĄ aplanką
   `vdu-steam-planas` į langą.
3. Po ~30 sek. gausite adresą, pvz. `https://kazkas-123.netlify.app`.
   Galite pasikeisti į gražesnį: **Site configuration → Change site name** →
   pvz. `vdu-steam-planas` → adresas taps `vdu-steam-planas.netlify.app`.

## 3. Pirmas prisijungimas

1. Atsidarykite svetainės adresą → **Registruotis** → įveskite TĄ PATĮ el.
   paštą, kurį įrašėte 1.4 žingsnyje, ir sugalvokite slaptažodį.
2. Prisijungsite kaip administratorius. Eikite į **Komanda** ir kiekvienam
   žmogui per **Redaguoti** įrašykite jo el. paštą.
3. Išsiųskite komandai svetainės adresą: kiekvienas spaudžia **Registruotis**,
   įveda savo el. paštą (tą, kurį įrašėte) ir susikuria slaptažodį. Viskas.

## 4. Įrenginiai

* **Kompiuteris:** aplanke `darbalaukis` yra failas `STEAM planas.html` —
  įrašykite jame svetainės adresą (vietoj `PAKEISKITE-MANE`), nukopijuokite
  failą žmonėms ant darbalaukio. Dvigubas paspaudimas — ir sistema atsidaro.
* **iPhone:** atsidaryti svetainę per Safari → pasidalinimo mygtukas →
  **Add to Home Screen / Pridėti į pradžios ekraną**.
* **Android:** atsidaryti per Chrome → meniu (⋮) → **Pridėti prie pagrindinio
  ekrano** (arba „Įdiegti programą“).

## Jei kas nors pasikeis

* Pakeitus programos failus — tiesiog dar kartą įtempkite aplanką į Netlify
  (Deploys → drag & drop). Duomenys gyvena Supabase, todėl niekur nedingsta.
* Pamiršus slaptažodį — administratorius gali jį pakeisti Supabase:
  **Authentication → Users →** prie žmogaus **⋮ → Reset password**.
* Nemokamų ribų (Supabase: 500 MB duomenų, 50 000 prisijungusių per mėn.;
  Netlify: 100 GB srauto) 15 žmonių komandai užteks su didele atsarga.
