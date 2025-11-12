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
      console.error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
      throw new Error('LINE Channel Access Token is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { lineUserId, imageBase64, billInfo } = await req.json();

    // Validate LINE User ID
    if (!lineUserId || typeof lineUserId !== 'string') {
      console.error('Invalid LINE User ID:', lineUserId);
      return new Response(
        JSON.stringify({ error: 'LINE User ID is required and must be a valid string' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedUserId = lineUserId.trim();
    
    // Validate it's not empty after trim
    if (trimmedUserId.length === 0) {
      console.error('LINE User ID is empty after trim');
      return new Response(
        JSON.stringify({ error: 'LINE User ID cannot be empty' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate LINE User ID format (should start with U and be 33 characters)
    if (!trimmedUserId.startsWith('U') || trimmedUserId.length !== 33) {
      console.error('Invalid LINE User ID format:', trimmedUserId);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid LINE User ID format. It should start with "U" and be 33 characters long.',
          receivedLength: trimmedUserId.length,
          receivedPrefix: trimmedUserId.substring(0, 1)
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image data
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      console.error('Invalid image data');
      return new Response(
        JSON.stringify({ error: 'Image data is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing LINE message for user:', trimmedUserId);
    console.log('Bill info:', billInfo);

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    let base64Data = imageBase64;
    if (imageBase64.includes(',')) {
      base64Data = imageBase64.split(',')[1];
    }

    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    console.log('Image size:', binaryData.length, 'bytes');

    // Generate unique filename
    const timestamp = Date.now();
    const billNo = billInfo?.billNo || 'bill';
    const fileName = `line-bills/${timestamp}-${billNo}.png`;

    console.log('Uploading image to Supabase Storage:', fileName);

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('diary-images')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Failed to upload image to storage:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('Image uploaded successfully:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('diary-images')
      .getPublicUrl(fileName);

    if (!publicUrl) {
      console.error('Failed to get public URL');
      throw new Error('Failed to generate public URL for image');
    }

    console.log('Public URL generated:', publicUrl);

    // Prepare text message
    const textMessage = [
      `📄 ${billInfo?.type === 'buy' ? 'บิลซื้อ' : 'บิลขาย'} ${billInfo?.billNo || ''}`,
      `👤 ${billInfo?.customer || ''}`,
      `💰 ${billInfo?.total ? Number(billInfo.total).toLocaleString('th-TH') : ''} บาท`,
      `📅 ${billInfo?.date || ''}`
    ].filter(line => line.split(' ').length > 1).join('\n');

    // Prepare LINE API payload
    const linePayload = {
      to: trimmedUserId,
      messages: [
        {
          type: 'text',
          text: textMessage
        },
        {
          type: 'image',
          originalContentUrl: publicUrl,
          previewImageUrl: publicUrl
        }
      ]
    };

    console.log('Sending to LINE API...');
    console.log('Payload:', JSON.stringify({ to: trimmedUserId, messageCount: linePayload.messages.length }));

    // Send message via LINE Messaging API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineAccessToken}`,
      },
      body: JSON.stringify(linePayload)
    });

    console.log('LINE API Response Status:', lineResponse.status);

    // Check response
    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error('LINE API Error Response:', errorText);
      
      let errorMessage = 'Failed to send message to LINE';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
        console.error('LINE API Error Details:', errorJson);
      } catch (e) {
        console.error('Could not parse error response');
      }

      throw new Error(`LINE API Error (${lineResponse.status}): ${errorMessage}`);
    }

    const responseData = await lineResponse.json();
    console.log('LINE API Success:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Bill sent to LINE successfully',
        sentTo: trimmedUserId,
        imageUrl: publicUrl
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-line-bill function:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: 'Please check the edge function logs for more information'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
