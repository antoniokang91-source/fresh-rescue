import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const solapiKey = Deno.env.get('SOLAPI_API_KEY')!
const solapiSecret = Deno.env.get('SOLAPI_API_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function sendKakaoTalk(
  phoneNumber: string,
  nickname: string,
  reservationId: string,
  reservationDate: string,
  productName: string,
  discountPrice: string,
  shopAddress: string,
  shopPhone: string
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
        templateId: 'KA01TP260516143321490q7KMWBqXJhU',
        variables: {
          '#{닉네임}': nickname || '고객',
          '#{예약번호}': reservationId || '-',
          '#{예약일시}': reservationDate || '-',
          '#{상품명}': productName || '상품',
          '#{할인가}': discountPrice || '0',
          '#{가게주소}': shopAddress || '-',
          '#{가게전화}': shopPhone || '-',
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
      .select('user_id, product_name, shop_id, total_amount, created_at')
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      console.error('Reservation not found:', resError)
      return new Response('Reservation not found', { status: 404 })
    }

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('phone, nickname')
      .eq('id', reservation.user_id)
      .single()

    if (memberError || !member?.phone) {
      console.error('Member not found:', memberError)
      return new Response('Member not found', { status: 404 })
    }

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('address, phone')
      .eq('id', reservation.shop_id)
      .single()

    if (shopError || !shop) {
      console.error('Shop not found:', shopError)
      return new Response('Shop not found', { status: 404 })
    }

    const createdAtDate = new Date(reservation.created_at)
    const reservationDate = createdAtDate.toISOString().slice(0, 16).replace('T', ' ')

    console.log(`Sending reservation confirmed KakaoTalk to ${member.phone}`)

    const kakaoResult = await sendKakaoTalk(
      member.phone,
      member.nickname || '고객',
      reservationId,
      reservationDate,
      reservation.product_name || '상품',
      reservation.total_amount?.toString() || '0',
      shop.address || '-',
      shop.phone || '-'
    )

    if (kakaoResult.statusCode !== '2000') {
      console.error('KakaoTalk send failed:', kakaoResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send reservation confirmed message', details: kakaoResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Reservation confirmed notification sent successfully')

    return new Response(JSON.stringify({ success: true, messageId: kakaoResult.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
