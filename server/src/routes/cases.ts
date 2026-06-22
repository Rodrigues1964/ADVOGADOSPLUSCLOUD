import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

const router = Router()
const prisma = new PrismaClient()

router.use(requireAuth as any)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const cases = await prisma.case.findMany({
      where: { tenant_id: req.tenantId },
      include: { client: true }
    })
    res.json(cases)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar processos' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const newCase = await prisma.case.create({
      data: {
        ...req.body,
        tenant_id: req.tenantId!
      }
    })
    res.json(newCase)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar processo' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const updatedCase = await prisma.case.update({
      where: { id: req.params.id, tenant_id: req.tenantId },
      data: req.body
    })
    res.json(updatedCase)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar processo' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.case.delete({
      where: { id: req.params.id, tenant_id: req.tenantId }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir processo' })
  }
})

export default router
