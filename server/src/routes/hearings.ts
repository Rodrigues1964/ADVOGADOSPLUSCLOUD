import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

const router = Router()
const prisma = new PrismaClient()

router.use(requireAuth as any)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const items = await prisma.hearing.findMany({
      where: { tenant_id: req.tenantId }
    })
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar audiências' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const newItem = await prisma.hearing.create({
      data: {
        ...req.body,
        tenant_id: req.tenantId!
      }
    })
    res.json(newItem)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar audiência' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const updatedItem = await prisma.hearing.update({
      where: { id: req.params.id, tenant_id: req.tenantId },
      data: req.body
    })
    res.json(updatedItem)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar audiência' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.hearing.delete({
      where: { id: req.params.id, tenant_id: req.tenantId }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir audiência' })
  }
})

export default router
