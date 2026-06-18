// Sistemos nustatymai.
// Sukūrus Supabase projektą, čia įrašykite jo adresą ir "anon public" raktą
// (Supabase → Project Settings → API). Kol laukeliai tušti, sistema veikia
// DEMO režimu: duomenys saugomi tik šiame įrenginyje.
window.APP_CONFIG = {
  SUPABASE_URL: "https://wiqvozhvfcxnvfoljjlu.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_277nGapf-HJ6EIvJQRLvyw_Xq0o_pph",
  APP_NAME: "VDU STEAM planas",
  POLL_INTERVAL_MS: 3000,
  // Telefono push pranešimai (Web Push). Viešas VAPID raktas — saugu laikyti čia.
  // Privatus raktas dedamas TIK į Supabase Edge Function „secrets" (žr. DIEGIMAS-PRANESIMAI.md).
  VAPID_PUBLIC_KEY: "BJbfksgyDw6jO8zISTBKXahDpXED9-1KC9t4CjMYf07P8JHj-pyGo1AMubz26AsdLPU1t_A-rguL63HPpsafv8k"
};
