import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const solapiKey = Deno.env.get('SOLAPI_API_KEY')!
const solapiSecret = Deno.env.get('SOLAPI_API_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function sendKakaoTalk(
  phoneNumber: string,
  shopName: string,
  productName: string,
  customerName: string,
  reservationNumber: string,
  amount: number,
  quantity: number,
  shopPhoneNumber: string
) {
  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000).toString()
  const salt = Math.random().toString(36).substring(2, 10)

  const signMessage = `${solapiKey}${timestamp}${salt}${solapiSecret}`
  const encoder = new TextEncoder()
  const data = encoder.encode(signMessage)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  const requestBody = {
    message: {
      to: phoneNumber,
      from: shopPhoneNumber,
      kakaoOptions: {
        pfId: 'KA01PF260516135625129XEUjTYPRYlJ',
        templateId: 'KA01TP260516152207982xNMZWcN9ipd',
        variables: {
          '#{shop_name}': shopName || '가게',
          '#{productName}': productName || '상품',
          '#{닉네임}': customerName || '고객',
          '#{예약번호}': reservationNumber || '-',
          '#{금액}': amount.toString() || '0',
          '#{quantity}': quantity.toString() || '1',
        },
        disableSms: false,
      },
    },
    apiKey: solapiKey,
    timestamp: timestamp,
    salt: salt,
    signature: signature,
  }

  const response = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const body = await req.json()
    const reservationId = body.reservationId || body.reservation_id

    if (!reservationId) {
      return new Response('Missing reservationId', { status: 400 })
    }

    // 예약 정보 조회
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('product_name, user_nickname, quantity, shop_id, total_amount')
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      console.error('Reservation not found:', resError)
      return new Response('Reservation not found', { status: 404 })
    }

    // 가게 정보 조회
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('shop_name, phone')
      .eq('id', reservation.shop_id)
      .single()

    if (shopError || !shop?.phone) {
      console.error('Shop information not found:', shopError)
      return new Response('Shop information not found', { status: 404 })
    }

    console.log(`Sending new reservation KakaoTalk to ${shop.phone}`)

    const kakaoResult = await sendKakaoTalk(
      shop.phone,
      shop.shop_name || '가게',
      reservation.product_name || '신상품',
      reservation.user_nickname || '고객',
      reservationId,
      reservation.total_amount || 0,
      reservation.quantity || 1,
      shop.phone
    )

    if (kakaoResult.resultCode !== '0') {
      console.error('KakaoTalk send failed:', kakaoResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send KakaoTalk', details: kakaoResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('New reservation notification sent successfully')

    return new Response(JSON.stringify({ success: true, messageId: kakaoResult.data?.[0]?.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
