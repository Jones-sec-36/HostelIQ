const SUPABASE_URL = "https://dezldhinizayqzfrfsby.supabase.co";
const SUPABASE_KEY = "sb_publishable_lHxwO27ZOLoFcAjXkZyfNg_rqC83qGF";

let supabase = null;
if (window.supabase) {
    supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );
    window.supabaseClient = supabase;
} else {
    console.warn("Supabase SDK not loaded yet.");
}

// Test connection
async function testConnection() {
    if (!supabase) {
        console.warn("Supabase not initialized, skipping connection test.");
        return;
    }
    const { data, error } = await supabase
        .from("students")
        .select("*");

    if (error) {
        console.error("Supabase Error:", error);
    } else {
        console.log("✅ Connected to Supabase");
        console.table(data);
    }
}

testConnection();