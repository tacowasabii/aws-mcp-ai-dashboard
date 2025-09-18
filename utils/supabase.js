import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ckolilumwmotfjajnwqb.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb2xpbHVtd21vdGZqYWpud3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIwNzE2NywiZXhwIjoyMDczNzgzMTY3fQ.WbFsiDbN50dYnyu9H_66CIVHcJl6WGQ8AeAGwOkIdBI";

export const supabase = createClient(supabaseUrl, supabaseKey);
