import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const solapiKey = Deno.env.get('SOLAPI_API_KEY')!
const solapiSecret = Deno.env.get('SOLAPI_API_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function sendKakaoTalk(phoneNumber: string, sellerName: string) {
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
  body.append('kakaoOptions.templateId', 'TjQDrwTOuBu')

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

    const { phone, sellerName } = await req.json()

    if (!phone) {
      return new Response('Missing phone number', { status: 400 })
    }

    console.log(`Sending shop approval KakaoTalk to ${phone}`)

    const kakaoResult = await sendKakaoTalk(phone, sellerName || '사장님')

    if (kakaoResult.resultCode !== '0') {
      console.error('KakaoTalk send failed:', kakaoResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send KakaoTalk', details: kakaoResult }),
        { status: 500 }
      )
    }

    console.log('Shop approval notification sent successfully')

    return new Response(JSON.stringify({ success: true, messageId: kakaoResult.data?.[0]?.messageId }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
