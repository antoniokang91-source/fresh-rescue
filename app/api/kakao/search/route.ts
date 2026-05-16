export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return Response.json({ error: 'Query required' }, { status: 400 })
  }

  try {
    const apiKey = process.env.KAKAO_API_KEY || process.env.NEXT_PUBLIC_KAKAO_API_KEY

    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 })
    }

    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `KakaoAK ${apiKey}`
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return Response.json(
        { error: 'Kakao API error', status: response.status, details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: 'Search failed', details: String(error) }, { status: 500 })
  }
}
