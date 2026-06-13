# Automatinės atsarginės kopijos

Sistema gali kasdien pati pasidaryti visų duomenų kopiją ir įrašyti ją į
GitHub repozitoriją (aplankas `backups/`). Tam reikia vieną kartą pridėti
slaptą raktą — užtruks ~3 minutes.

## Vienkartinis nustatymas

1. **Supabase** → kairėje apačioje **Project Settings** → **API Keys** →
   skirtukas **Publishable and secret API keys** → prie **Secret keys** →
   eilutė `default` → paspauskite akies ikoną, kad pamatytumėte raktą →
   nukopijuokite jį (prasideda `sb_secret_...`).

   > Šis raktas yra slaptas — niekam jo nesiųskite ir nedėkite į svetainę.
   > Jis naudojamas tik atsarginėms kopijoms ir saugomas GitHub paslaptyse.

2. **GitHub** → atidarykite repozitoriją `silence270/vdu-steam-planas` →
   **Settings** → kairėje **Secrets and variables** → **Actions** →
   **New repository secret**.
3. **Name:** `SUPABASE_SERVICE_KEY` · **Secret:** įklijuokite nukopijuotą
   raktą → **Add secret**.

Viskas. Nuo šiol kiekvieną naktį GitHub padarys kopiją automatiškai.

## Kaip patikrinti, ar veikia

GitHub repozitorijoje → **Actions** → **Atsarginė kopija** → **Run workflow**
(paleisti rankiniu būdu pirmą kartą). Po minutės aplanke `backups/` atsiras
failas `YYYY-MM-DD.json` su visais duomenimis.

## Kaip atstatyti duomenis (jei kada prireiktų)

Kopijos failai yra paprastas tekstas (JSON) su visomis lentelėmis. Jei kada
nors reikės atstatyti — atsiųskite man tą failą, ir aš sugrąžinsiu duomenis
į duomenų bazę. Patiems nieko daryti nereikia.
