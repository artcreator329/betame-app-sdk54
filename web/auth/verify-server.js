// Server-side email verification handler for BetaMe
// This can be deployed as a serverless function (Netlify, Vercel, etc.)

// For Netlify Functions
exports.handler = async (event, context) => {
    return await handleEmailVerification(event);
};

// For Vercel (if using Vercel instead)
// export default async function handler(req, res) {
//     const event = { queryStringParameters: req.query };
//     const result = await handleEmailVerification(event);
//     res.status(result.statusCode).end(result.body);
// }

async function handleEmailVerification(event) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    try {
        // Get parameters from the URL
        const { token_hash, type, next } = event.queryStringParameters || {};

        if (!token_hash || !type) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing required parameters: token_hash and type' 
                })
            };
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration');
        }

        // Call Supabase to verify the email
        const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
                token_hash,
                type
            })
        });

        const verificationResult = await response.json();

        if (response.ok && verificationResult.access_token) {
            // Success! Email verified
            const redirectUrl = new URL('/auth/verify-email.html', 'https://betame.com.my');
            redirectUrl.searchParams.set('token_hash', token_hash);
            redirectUrl.searchParams.set('type', type);
            redirectUrl.searchParams.set('status', 'success');
            if (next) {
                redirectUrl.searchParams.set('next', next);
            }

            // Return a redirect to the web verification page
            return {
                statusCode: 302,
                headers: {
                    ...headers,
                    'Location': redirectUrl.toString()
                },
                body: ''
            };
        } else {
            // Verification failed
            const errorMessage = verificationResult.error_description || 
                               verificationResult.message || 
                               'Email verification failed';
            
            const redirectUrl = new URL('/auth/verify-email.html', 'https://betame.com.my');
            redirectUrl.searchParams.set('status', 'error');
            redirectUrl.searchParams.set('error', errorMessage);

            return {
                statusCode: 302,
                headers: {
                    ...headers,
                    'Location': redirectUrl.toString()
                },
                body: ''
            };
        }

    } catch (error) {
        console.error('Email verification error:', error);
        
        // Redirect to error page
        const redirectUrl = new URL('/auth/verify-email.html', 'https://betame.com.my');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('error', 'Internal server error');

        return {
            statusCode: 302,
            headers: {
                ...headers,
                'Location': redirectUrl.toString()
            },
            body: ''
        };
    }
}

// For local testing or other environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleEmailVerification };
}
