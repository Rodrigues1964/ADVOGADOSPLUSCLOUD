import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AuthRequest extends Request {
  user?: any
  tenantId?: string
  userRole?: string
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
    req.user = decoded
    
    // The frontend sends the desired tenant ID in the header x-tenant-id
    const requestedTenantId = req.headers['x-tenant-id'] as string || decoded.tenant_id

    // Check if user has access to this tenant
    if (requestedTenantId) {
      const membership = await prisma.tenantMember.findUnique({
        where: {
          tenant_id_profile_id: {
            tenant_id: requestedTenantId,
            profile_id: decoded.user_id
          }
        }
      })

      if (!membership && decoded.role !== 'master') {
        return res.status(403).json({ error: 'Acesso negado a este workspace' })
      }
    } else if (decoded.role !== 'master') {
      return res.status(403).json({ error: 'Tenant não especificado' })
    }

    req.tenantId = requestedTenantId
    req.userRole = decoded.role
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' })
  }
}
