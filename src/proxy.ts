import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // Auto-logout: if logged in but login_at cookie is older than 1 day
  if (session) {
    const loginAt = request.cookies.get('sf_login_at')?.value
    if (!loginAt || Date.now() - parseInt(loginAt) > ONE_DAY_MS) {
      await supabase.auth.signOut()
      const res = NextResponse.redirect(new URL('/login?reason=expired', request.url))
      res.cookies.delete('sf_login_at')
      return res
    }
  }

  // Redirect unauthenticated users to login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from login
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

