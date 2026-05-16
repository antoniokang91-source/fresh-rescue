import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const solapiKey = Deno.env.get('SOLAPI_API_KEY')!
const solapiSecret = Deno.env.get('SOLAPI_API_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function sendKakaoTalk(
  phoneNumber: string,
  productName: string,
  customerName: string,
  quantity: number
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

  const body = new FormData()
  body.append('apiKey', solapiKey)
  body.append('timestamp', timestamp)
  body.append('salt', salt)
  body.append('signature', signature)
  body.append('to', phoneNumber)
  body.append('kakaoOptions.pfId', '22081923441905092819')
  body.append('kakaoOptions.templateId', 'f9zuRTi1o9')
  body.append('templateParameter', JSON.stringify({
    productName: productName || '상품',
    customerName: customerName || '고객',
    quantity: quantity || 1,
  }))

  const response = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    body: body,
  })

  return await response.json()
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { reservationId } = await req.json()

    if (!reservationId) {
      return new Response('Missing reservationId', { status: 400 })
    }

    // 예약 정보 조회
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('product_name, user_nickname, quantity, shop_id')
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      console.error('Reservation not found:', resError)
      return new Response('Reservation not found', { status: 404 })
    }

    // 가게 주인 정보 조회
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('owner_id, phone')
      .eq('id', reservation.shop_id)
      .single()

    if (shopError || !shop?.phone) {
      console.error('Shop owner phone not found:', shopError)
      return new Response('Shop owner phone not found', { status: 404 })
    }

    console.log(`Sending new reservation KakaoTalk to ${shop.phone}`)

    const kakaoResult = await sendKakaoTalk(
      shop.phone,
      reservation.product_name || '신상품',
      reservation.user_nickname || '고객',
      reservation.quantity || 1
    )

    if (kakaoResult.resultCode !== '0') {
      console.error('KakaoTalk send failed:', kakaoResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send KakaoTalk', details: kakaoResult }),
        { status: 500 }
      )
    }

    console.log('New reservation notification sent successfully')

    return new Response(JSON.stringify({ success: true, messageId: kakaoResult.data?.[0]?.messageId }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
