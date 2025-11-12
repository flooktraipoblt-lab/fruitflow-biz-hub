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

    // Validate required fields
    if (!lineUserId || typeof lineUserId !== 'string' || lineUserId.trim().length === 0) {
      console.error('Invalid lineUserId:', lineUserId);
      return new Response(
        JSON.stringify({ error: 'Invalid or missing LINE User ID' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      console.error('Invalid imageBase64');
      return new Response(
        JSON.stringify({ error: 'Invalid or missing image data' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedUserId = lineUserId.trim();
    console.log('Sending bill to LINE user:', trimmedUserId);

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

    // Prepare LINE message payload
    const linePayload = {
      to: trimmedUserId,
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
    };

    console.log('Sending to LINE API with payload:', JSON.stringify({
      to: trimmedUserId,
      messageCount: linePayload.messages.length
    }));

    // Send image message via LINE Messaging API
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineAccessToken}`,
      },
      body: JSON.stringify(linePayload)
    });

    const responseStatus = response.status;
    console.log('LINE API Response Status:', responseStatus);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('LINE API Error Response:', errorData);
      console.error('LINE API Status:', responseStatus);
      
      // Try to parse error details
      try {
        const errorJson = JSON.parse(errorData);
        throw new Error(`LINE API Error (${responseStatus}): ${errorJson.message || errorData}`);
      } catch (parseError) {
        throw new Error(`LINE API Error (${responseStatus}): ${errorData}`);
      }
    }

    const responseData = await response.json();
    console.log('LINE API Success Response:', responseData);
    console.log('Bill sent successfully to LINE user:', trimmedUserId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Bill sent to LINE successfully',
        lineUserId: trimmedUserId 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-line-bill function:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check edge function logs for more information'
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
