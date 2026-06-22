import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

const router = Router()
const prisma = new PrismaClient()

router.use(requireAuth as any)

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId

    const [cases, tasks, clients, hearings] = await Promise.all([
      prisma.case.count({ where: { tenant_id: tenantId, status: 'active' } }),
      prisma.task.count({ where: { tenant_id: tenantId, status: 'todo' } }),
      prisma.client.count({ where: { tenant_id: tenantId } }),
      prisma.hearing.count({ where: { tenant_id: tenantId, date: { gte: new Date() } } })
    ])

    const recentCases = await prisma.case.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 5
    })

    const upcomingHearings = await prisma.hearing.findMany({
      where: { tenant_id: tenantId, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5
    })

    res.json({
      stats: {
        activeCases: cases,
        pendingTasks: tasks,
        totalClients: clients,
        upcomingHearings: hearings
      },
      recentCases,
      upcomingHearings
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dashboard data' })
  }
})

export default router
