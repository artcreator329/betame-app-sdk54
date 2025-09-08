const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'text/html',
    };

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Get parameters from the URL
        const { token_hash, type, next } = event.queryStringParameters || {};

        console.log('Email verification request:', { token_hash: !!token_hash, type, next });

        if (!token_hash || !type) {
            return redirectToWebPage('error', 'Missing required parameters: token_hash and type');
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase configuration');
            return redirectToWebPage('error', 'Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Call Supabase to verify the email using verifyOtp
        console.log('Attempting to verify OTP with Supabase...');
        
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type
        });

        if (error) {
            console.error('Supabase verification error:', error);
            const errorMessage = error.message || 'Email verification failed';
            return redirectToWebPage('error', errorMessage);
        }

        if (data?.user) {
            console.log('Email verification successful for user:', data.user.id);
            // Success! Email verified
            return redirectToWebPage('success', 'Email verified successfully', { token_hash, type, next });
        } else {
            console.error('No user data returned from verification');
            return redirectToWebPage('error', 'Verification failed - no user data');
        }

    } catch (error) {
        console.error('Email verification error:', error);
        return redirectToWebPage('error', 'Internal server error');
    }
};

function redirectToWebPage(status, message, params = {}) {
    const baseUrl = 'https://betame.com.my';
    const redirectUrl = new URL('/auth/verify-email.html', baseUrl);
    
    redirectUrl.searchParams.set('status', status);
    redirectUrl.searchParams.set('message', message);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            redirectUrl.searchParams.set(key, value);
        }
    });

    return {
        statusCode: 302,
        headers: {
            'Location': redirectUrl.toString(),
            'Cache-Control': 'no-cache'
        },
        body: ''
    };
}
