(function () {
  const SUPABASE_URL = "https://lhtqlftxctxjguxhzvxq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_3jTA4mBXkPdSESdaDarYdA_GGx-hh8h";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase library not loaded.");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.BXSupabase = {
    client,
  };
})();
