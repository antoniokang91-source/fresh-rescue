import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const solapiKey = Deno.env.get('SOLAPI_API_KEY')!
const solapiSecret = Deno.env.get('SOLAPI_API_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function sendKakaoTalk(
  phoneNumber: string,
  productName: string,
  shopName: string
) {
  const now = new Date()
  const date = now.toISOString()
  const salt = Math.random().toString(36).substring(2, 10)

  const signData = `${date}${salt}`
  const encoder = new TextEncoder()
  const data = encoder.encode(signData)
  const secretData = encoder.encode(solapiSecret)
  const hashBuffer = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', secretData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  const requestBody = {
    message: {
      to: phoneNumber,
      from: phoneNumber,
      kakaoOptions: {
        pfId: 'KA01PF260516135625129XEUjTYPRYIJ',
        templateId: 'KA01TP260516144158974JaP2DV7tZrn',
        variables: {
          '#{상품명}': productName || '상품',
          '#{가게명}': shopName || '가게',
        },
        disableSms: false,
      },
    },
  }

  const authHeader = `HMAC-SHA256 apiKey=${solapiKey}, date=${date}, salt=${salt}, signature=${signature}`

  const response = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify(requestBody),
  })

  return await response.json()
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const body = await req.json()
    const reservationId = body.reservationId

    if (!reservationId) {
      return new Response('Missing reservationId', { status: 400 })
    }

    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('product_name, shop_id')
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      console.error('Reservation not found:', resError)
      return new Response('Reservation not found', { status: 404 })
    }

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('shop_name, phone')
      .eq('id', reservation.shop_id)
      .single()

    if (shopError || !shop?.phone) {
      console.error('Shop not found:', shopError)
      return new Response('Shop not found', { status: 404 })
    }

    console.log(`Sending transaction completed KakaoTalk to ${shop.phone}`)

    const kakaoResult = await sendKakaoTalk(
      shop.phone,
      reservation.product_name || '상품',
      shop.shop_name || '가게'
    )

    if (kakaoResult.statusCode !== '2000') {
      console.error('KakaoTalk send failed:', kakaoResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send transaction completed message', details: kakaoResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transaction completed notification sent successfully')

    return new Response(JSON.stringify({ success: true, messageId: kakaoResult.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
