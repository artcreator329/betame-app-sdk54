import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get parameters from the URL
    const url = new URL(req.url)
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')
    const next = url.searchParams.get('next')

    console.log('Email verification request:', { 
      hasTokenHash: !!tokenHash, 
      type, 
      next 
    })

    if (!tokenHash || !type) {
      return redirectToWebPage('error', 'Missing required parameters: token_hash and type')
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Call Supabase to verify the email using verifyOtp
    console.log('Attempting to verify OTP with Supabase...')
    
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any
    })

    if (error) {
      console.error('Supabase verification error:', error)
      const errorMessage = error.message || 'Email verification failed'
      return redirectToWebPage('error', errorMessage)
    }

    if (data?.user) {
      console.log('Email verification successful for user:', data.user.id)
      // Success! Email verified
      return redirectToWebPage('success', 'Email verified successfully', { 
        token_hash: tokenHash, 
        type, 
        next 
      })
    } else {
      console.error('No user data returned from verification')
      return redirectToWebPage('error', 'Verification failed - no user data')
    }

  } catch (error) {
    console.error('Email verification error:', error)
    return redirectToWebPage('error', 'Internal server error')
  }
})

function redirectToWebPage(status: string, message: string, params: Record<string, any> = {}) {
  const baseUrl = 'https://betame.com.my'
  const redirectUrl = new URL('/auth/verify-email.html', baseUrl)
  
  redirectUrl.searchParams.set('status', status)
  redirectUrl.searchParams.set('message', message)
  
  // Add additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      redirectUrl.searchParams.set(key, value.toString())
    }
  })

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': redirectUrl.toString(),
      'Cache-Control': 'no-cache'
    }
  })
}
