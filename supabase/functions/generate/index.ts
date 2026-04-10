import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Create a Supabase client with the Auth context of the user calling the function
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the user from the auth token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call OpenAI API
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return new Response(JSON.stringify({ error: `OpenAI API Error: ${errorText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await openAiResponse.json();
    const aiResponseText = data.choices[0].message.content;

    // Save request to Supabase DB using a service role key to bypass RLS if necessary, 
    // or just the user's client since RLS allows them to insert their own.
    const { error: dbError } = await supabaseClient
      .from('requests')
      .insert({
        user_id: user.id,
        prompt: prompt,
        response: aiResponseText,
      });

    if (dbError) {
      console.error("Error logging to database:", dbError);
      // We don't necessarily fail the request here, but log it
    }

    return new Response(
      JSON.stringify({ response: aiResponseText }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
