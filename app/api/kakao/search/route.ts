export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return Response.json({ error: 'Query required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}`,
        },
      }
    )

    if (!response.ok) {
      return Response.json({ error: 'Kakao API error' }, { status: response.status })
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: 'Search failed' }, { status: 500 })
  }
}
