import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  if (pathname === '/login') return response

  // Check Supabase session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = request.cookies.get('sf_role')?.value

  // Clients can only access /client
  if (role === 'client' && pathname !== '/client') {
    return NextResponse.redirect(new URL('/client', request.url))
  }

  // Site engineers can only access /engineer/*
  if (role === 'site_engineer') {
    const allowed = pathname === '/engineer' || pathname.startsWith('/engineer/')
    if (!allowed) return NextResponse.redirect(new URL('/engineer', request.url))
  }

  // Project managers can only access /manager/*
  if (role === 'project_manager') {
    const allowed = pathname === '/manager' || pathname.startsWith('/manager/')
    if (!allowed) return NextResponse.redirect(new URL('/manager', request.url))
  }

  // Coordinators can only access /coordinator/* and /projects/*
  if (role === 'coordinator') {
    const allowed = pathname === '/coordinator'
      || pathname.startsWith('/coordinator/')
      || pathname.startsWith('/projects/')
    if (!allowed) return NextResponse.redirect(new URL('/coordinator', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|api).*)'],
}
