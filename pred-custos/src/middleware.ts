import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken, UserRole } from '@/server/utils/jwt'
import { getAccessTokenFromCookies } from '@/server/utils/cookies'

// Rotas que não precisam de autenticação (apenas login e register + suas APIs necessárias)
const publicRoutes = [
  '/login',
  '/register',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
]

// Rotas que precisam de admin
const adminRoutes = [
  '/api/admin',
  '/api/models/train',
  '/api/users',
  '/admin'
]

/**
 * Middleware do Next.js para autenticação e autorização
 * Verifica tokens JWT em cookies ou headers e protege rotas
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  console.log(`[Middleware] Verificando rota: ${pathname}`)

  // 1. Verifica se é uma rota pública (as únicas acessíveis sem token)
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    console.log('[Middleware] Rota pública, permitindo acesso')
    return NextResponse.next()
  }

  // Debug: Listar todos os cookies disponíveis
  const cookiesDebug: Record<string, string> = {};
  request.cookies.getAll().forEach(cookie => {
    cookiesDebug[cookie.name] = cookie.value ? 'presente' : 'ausente';
  });
  console.log('[Middleware] Cookies disponíveis:', cookiesDebug)

  // Permitir acesso a assets estáticos (além dos já configurados no matcher)
  if (pathname.includes('_next') || pathname.includes('favicon.ico')) {
    console.log('[Middleware] Asset estático, permitindo acesso')
    return NextResponse.next()
  }

  try {
    // 2. Tenta obter token de acesso (primeiro de cookies, depois do header)
    let token = request.cookies.get('access_token')?.value
    
    console.log('[Middleware] Token nos cookies:', token ? 'Presente' : 'Ausente')
    if (token) {
      // Mostrar os primeiros e últimos caracteres do token para debug (não mostrar o token completo)
      console.log(`[Middleware] Token preview: ${token.substring(0, 5)}...${token.substring(token.length - 5)}`)
      console.log(`[Middleware] Token length: ${token.length}`)
    }
    
    // Se não encontrou no cookie, tenta no header Authorization
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]
        console.log('[Middleware] Token obtido do header Authorization')
      }
    }

    // Se não há token, não está autenticado - bloqueia acesso
    if (!token) {
      console.log('[Middleware] Token não encontrado')
      
      // Se for uma requisição de API, retornar JSON 401
      if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      // Se for uma página, redirecionar para login
      const url = new URL('/login', request.url)
      return NextResponse.redirect(url)
    }

    // 3. Verifica e decodifica o token
    try {
      console.log('[Middleware] Tentando verificar token JWT, comprimento:', token.length);
      console.log('[Middleware] Fragmento do token:', token.substring(0, 10) + '...' + token.substring(token.length - 10));
      
      const payload = await verifyAccessToken(token)
      console.log(`[Middleware] Token válido, usuário: ${payload.email}, role: ${payload.role}`)
  
      // 4. Verifica se é rota de admin e se o usuário tem permissão
      if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (payload.role !== UserRole.ADMIN) {
          console.log('[Middleware] Acesso negado a rota de admin')
          return new NextResponse(JSON.stringify({ error: 'Acesso negado' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        console.log('[Middleware] Acesso admin autorizado')
      }
  
      // Adicionar informações do usuário ao request para uso nas rotas
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', payload.sub)
      requestHeaders.set('x-user-email', payload.email)
      requestHeaders.set('x-user-role', payload.role)
      
      // Tudo ok - permitir acesso
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (tokenError) {
      console.error('[Middleware] Erro na validação do token:', tokenError instanceof Error ? tokenError.message : 'Erro desconhecido')
      
      // Evitar redirecionamento para login se já estiver em uma rota pública
      if (pathname === '/login' || pathname === '/register') {
        console.log('[Middleware] Erro de token em rota pública, permitindo acesso direto sem redirecionamento')
        return NextResponse.next()
      }
      
      // Se for uma requisição de API, retornar JSON 401
      if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      // Se o token é inválido e for uma página, redirecionamos para login
      console.log('[Middleware] Redirecionando para /login devido a token inválido')
      const url = new URL('/login', request.url)
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.log('[Middleware] Erro de autenticação:', error instanceof Error ? error.message : 'Erro desconhecido')
    
    // Se for uma requisição de API, retornar JSON 500
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Se for uma página, redirecionar para login
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }
}

// Configurar quais rotas devem passar pelo middleware (evitando _next, etc)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
