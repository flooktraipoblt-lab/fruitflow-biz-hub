import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lineAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
    if (!lineAccessToken) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
    }

    const { lineUserId, imageBase64, billInfo } = await req.json();

    if (!lineUserId || !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: lineUserId or imageBase64' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending bill to LINE user:', lineUserId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob for uploading to Supabase Storage
    const base64Data = imageBase64.split(',')[1]; // Remove data:image/png;base64, prefix
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Upload image to Supabase Storage
    const fileName = `line-bills/${Date.now()}-${billInfo?.billNo || 'bill'}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('diary-images')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('diary-images')
      .getPublicUrl(fileName);

    console.log('Image uploaded to:', publicUrl);

    // Send image message via LINE Messaging API
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineAccessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: `📄 ${billInfo?.type === 'buy' ? 'บิลซื้อ' : 'บิลขาย'} ${billInfo?.billNo || ''}\n` +
                  `👤 ${billInfo?.customer || ''}\n` +
                  `💰 ${billInfo?.total?.toLocaleString() || ''} บาท\n` +
                  `📅 ${billInfo?.date || ''}`
          },
          {
            type: 'image',
            originalContentUrl: publicUrl,
            previewImageUrl: publicUrl
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('LINE API Error:', errorData);
      throw new Error(`LINE API Error: ${errorData}`);
    }

    console.log('Bill sent successfully to LINE');

    return new Response(
      JSON.stringify({ success: true, message: 'Bill sent to LINE successfully' }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-line-bill function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
