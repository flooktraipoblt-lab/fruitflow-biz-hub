import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET');
    if (!channelSecret) {
      throw new Error('LINE_CHANNEL_SECRET is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get LINE signature from header
    const signature = req.headers.get('x-line-signature');
    const body = await req.text();

    // Verify signature
    if (signature) {
      const hash = createHmac('sha256', channelSecret)
        .update(body)
        .digest('base64');
      
      if (hash !== signature) {
        console.error('Invalid signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const data = JSON.parse(body);
    console.log('Webhook received:', JSON.stringify(data));

    // Process events
    for (const event of data.events || []) {
      const userId = event.source?.userId;
      if (!userId) continue;

      console.log('Processing event:', event.type, 'for user:', userId);

      // Get the first admin/owner user ID as the owner of this LINE user
      // In production, you might want to handle this differently
      const { data: adminUser } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      const ownerId = adminUser?.user_id;
      if (!ownerId) {
        console.error('No admin user found to assign as owner');
        continue;
      }

      if (event.type === 'follow') {
        // User added the official account as friend
        console.log('Follow event for user:', userId);

        // Get user profile from LINE
        const lineAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
        let profile = null;
        
        if (lineAccessToken) {
          try {
            const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
              headers: { 'Authorization': `Bearer ${lineAccessToken}` }
            });
            
            if (profileRes.ok) {
              profile = await profileRes.json();
              console.log('Got user profile:', profile);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        }

        // Upsert to line_users table
        const { error: upsertError } = await supabase
          .from('line_users')
          .upsert({
            line_user_id: userId,
            display_name: profile?.displayName || null,
            picture_url: profile?.pictureUrl || null,
            status_message: profile?.statusMessage || null,
            is_following: true,
            followed_at: new Date().toISOString(),
            unfollowed_at: null,
            owner_id: ownerId,
          }, {
            onConflict: 'line_user_id'
          });

        if (upsertError) {
          console.error('Error upserting line_user:', upsertError);
        } else {
          console.log('Successfully saved LINE user:', userId);
        }

      } else if (event.type === 'unfollow') {
        // User blocked or removed the official account
        console.log('Unfollow event for user:', userId);

        const { error: updateError } = await supabase
          .from('line_users')
          .update({
            is_following: false,
            unfollowed_at: new Date().toISOString(),
          })
          .eq('line_user_id', userId);

        if (updateError) {
          console.error('Error updating line_user:', updateError);
        } else {
          console.log('Successfully updated LINE user unfollow:', userId);
        }

      } else if (event.type === 'message' && event.message?.type === 'text') {
        // Handle text messages - you can implement linking logic here
        const messageText = event.message.text.trim();
        console.log('Message from user:', userId, 'text:', messageText);

        // Example: Check if message is a phone number to link with customer
        // You can implement your own linking logic here
        // For example: if user sends their phone number, link it to customer
        
        // Check if message looks like a phone number
        if (/^[0-9\-]{8,15}$/.test(messageText)) {
          // Try to find customer by phone
          const { data: customer } = await supabase
            .from('customers')
            .select('id, name')
            .eq('phone', messageText)
            .eq('owner_id', ownerId)
            .single();

          if (customer) {
            // Link LINE user to customer
            const { error: linkError } = await supabase
              .from('line_users')
              .update({
                customer_id: customer.id,
                linked_at: new Date().toISOString(),
              })
              .eq('line_user_id', userId);

            if (!linkError) {
              console.log('Linked LINE user to customer:', customer.name);
              
              // Optionally send confirmation message back to user
              if (lineAccessToken) {
                await fetch('https://api.line.me/v2/bot/message/reply', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${lineAccessToken}`,
                  },
                  body: JSON.stringify({
                    replyToken: event.replyToken,
                    messages: [{
                      type: 'text',
                      text: `✅ เชื่อมต่อบัญชีสำเร็จ!\n👤 ชื่อ: ${customer.name}\nคุณจะได้รับบิลผ่าน LINE โดยอัตโนมัติ`
                    }]
                  })
                });
              }
            }
          } else {
            // Customer not found
            if (lineAccessToken && event.replyToken) {
              await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${lineAccessToken}`,
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: [{
                    type: 'text',
                    text: '❌ ไม่พบข้อมูลลูกค้าด้วยเบอร์นี้\nกรุณาตรวจสอบเบอร์โทรศัพท์อีกครั้ง'
                  }]
                })
              });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in line-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
