import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { shop_id, product_name, shop_name } = await req.json()

    if (!shop_id || !product_name || !shop_name) {
      return new Response(JSON.stringify({ error: '필수 파라미터 누락' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 구독자 조회
    const { data: subs, error: subsError } = await supabase
      .from('shop_subscriptions')
      .select('user_id')
      .eq('shop_id', shop_id)

    if (subsError) {
      console.error('구독자 조회 오류:', subsError)
      return new Response(JSON.stringify({ error: '구독자 조회 실패' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const userIds = (subs || []).map((s: any) => s.user_id)
    if (!userIds.length) {
      return new Response(JSON.stringify({ message: 'no subscribers' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // FCM 토큰 조회
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('user_id', userIds)

    if (tokensError) {
      console.error('토큰 조회 오류:', tokensError)
      return new Response(JSON.stringify({ error: '토큰 조회 실패' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')
    if (!FCM_SERVER_KEY) {
      console.error('FCM_SERVER_KEY 환경변수 없음')
      return new Response(JSON.stringify({ error: 'FCM 설정 오류' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    // FCM 메시지 전송
    const sendPromises = (tokens || []).map((t: any) =>
      fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: t.token,
          notification: {
            title: `🥕 ${shop_name}`,
            body: `${product_name} 구조상품 등록!`,
          },
          webpush: {
            fcm_options: {
              link: '/',
            },
          },
        }),
      }).catch((err) => console.error('FCM 발송 오류:', err))
    )

    await Promise.allSettled(sendPromises)

    return new Response(JSON.stringify({ message: 'ok', subscribers: userIds.length }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Edge Function 오류:', error)
    return new Response(JSON.stringify({ error: '서버 오류' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
