export async function GET(request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : null

    // Skip geolocation for local development
    if (!ip || ip === '::1' || ip.startsWith('127.')) {
      return Response.json({ country: 'US', region: 'default' })
    }

    const res = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return Response.json({ country: 'US', region: 'default' })
    }

    const data = await res.json()
    const country = data.country || 'US'

    let region = 'default'
    if (country === 'IN') region = 'india'
    else if (['AE', 'SA', 'QA', 'KW', 'BH', 'OM'].includes(country)) region = 'uae'

    return Response.json({ country, region })
  } catch {
    return Response.json({ country: 'US', region: 'default' })
  }
}
