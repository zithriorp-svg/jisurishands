import { createClient } from '@supabase/supabase-js';

// Extracted directly from your payload
const supabaseUrl = 'https://elgtjgrpxnsoibrexixb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZ3RqZ3JweG5zb2licmV4aXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTIxMjQsImV4cCI6MjA4OTQyODEyNH0.FTWdgLNsQrEO73YIM4GihUJwV0Y5ro1nMfJbgzD4Ejo';

export const supabase = createClient(supabaseUrl, supabaseKey);
