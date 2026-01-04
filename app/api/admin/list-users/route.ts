import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && serviceRoleKey)
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

export async function GET() {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase Admin client not initialized.' }, { status: 500 });
        }

        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: error.status || 500 });
        }

        // Return only necessary fields
        const simplifiedUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            role: u.app_metadata?.role || u.user_metadata?.role || 'viewer',
            last_sign_in: u.last_sign_in_at
        }));

        return NextResponse.json({ users: simplifiedUsers }, { status: 200 });
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
