import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const role = request.cookies.get('sf_role')?.value
  const pathname = request.nextUrl.pathname

  // Clients can only access /client and /login
  if (role === 'viewer' && pathname !== '/viewer' && pathname !== '/login') {
    return NextResponse.redirect(new URL('/viewer', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|api).*)'],
}
