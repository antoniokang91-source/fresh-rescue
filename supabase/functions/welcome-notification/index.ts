import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const solapiKey = Deno.env.get('SOLAPI_API_KEY')!
const solapiSecret = Deno.env.get('SOLAPI_API_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function sendKakaoTalk(
  phoneNumber: string,
  customerName: string,
  signupDate: string,
  nickname: string
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
        templateId: 'KA01TP260516140208587pzIKxQt5NsE',
        variables: {
          '#{고객명}': customerName || '고객',
          '#{가입일시}': signupDate || '-',
          '#{닉네임}': nickname || '고객',
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
    const userId = body.userId
    const phone = body.phone

    if (!userId || !phone) {
      return new Response('Missing userId or phone', { status: 400 })
    }

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('nickname, created_at')
      .eq('id', userId)
      .single()

    if (memberError || !member) {
      console.error('Member not found:', memberError)
      return new Response('Member not found', { status: 404 })
    }

    const createdAtDate = new Date(member.created_at)
    const signupDate = createdAtDate.toISOString().slice(0, 16).replace('T', ' ')

    console.log(`Sending welcome KakaoTalk to ${phone}`)

    const kakaoResult = await sendKakaoTalk(
      phone,
      member.nickname || '고객',
      signupDate,
      member.nickname || '고객'
    )

    if (kakaoResult.statusCode !== '2000') {
      console.error('KakaoTalk send failed:', kakaoResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send welcome message', details: kakaoResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Welcome notification sent successfully')

    return new Response(JSON.stringify({ success: true, messageId: kakaoResult.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
