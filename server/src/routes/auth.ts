import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()
const prisma = new PrismaClient()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.profile.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true
          }
        }
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const activeMembership = user.memberships.find(m => m.tenant.status === 'active')
    const isMaster = user.memberships.some(m => m.role === 'master')

    if (!activeMembership && !isMaster) {
      return res.status(403).json({ error: 'Sua licença encontra-se suspensa ou você não tem acesso.' })
    }

    let tenantId = activeMembership?.tenant_id
    let role = activeMembership?.role

    if (isMaster) {
      role = 'master'
    }

    const token = jwt.sign(
      { 
        user_id: user.id, 
        tenant_id: tenantId,
        role: role
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    )

    // Set HttpOnly Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    })

    res.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        theme: user.theme,
        role: role,
        tenant_id: tenantId
      },
      tenant: activeMembership?.tenant,
      userTenants: user.memberships.map(m => m.tenant)
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
    const user = await prisma.profile.findUnique({
      where: { id: decoded.user_id },
      include: {
        memberships: {
          include: {
            tenant: true
          }
        }
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }

    const activeMembership = decoded.tenant_id ? user.memberships.find(m => m.tenant_id === decoded.tenant_id) : null
    const isMaster = user.memberships.some(m => m.role === 'master')
    
    let role = decoded.role
    if (isMaster) role = 'master'

    res.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        theme: user.theme,
        role: role,
        tenant_id: decoded.tenant_id
      },
      tenant: activeMembership?.tenant,
      userTenants: user.memberships.map(m => m.tenant)
    })

  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  res.json({ success: true })
})

export default router
