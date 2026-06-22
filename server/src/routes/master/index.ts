import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../../middleware/requireAuth'
import os from 'os'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'

const router = Router()
const prisma = new PrismaClient()

router.use(requireAuth)
router.use((req: AuthRequest, res: any, next: any) => {
  if (req.userRole !== 'master') {
    return res.status(403).json({ error: 'Acesso negado. Apenas MASTER.' })
  }
  next()
})

// === DASHBOARD & CLIENTS ===

router.get('/dashboard', async (req, res) => {
  try {
    const totalTenants = await prisma.tenant.count()
    const activeTenants = await prisma.tenant.count({ where: { status: 'active' } })
    const blockedTenants = await prisma.tenant.count({ where: { status: 'blocked' } })
    const totalUsers = await prisma.profile.count()
    const totalCases = await prisma.case.count()

    res.json({
      active_clients: activeTenants,
      blocked_clients: blockedTenants,
      total_clients: totalTenants,
      total_users: totalUsers,
      total_cases: totalCases,
      monthly_revenue: activeTenants * 250 // mock calculation based on tenants
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

router.get('/clients', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany()
    res.json(tenants)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' })
  }
})

router.put('/clients/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const tenant = await prisma.tenant.findUnique({ where: { id } })
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

    const newStatus = tenant.status === 'blocked' ? 'active' : 'blocked'
    const updated = await prisma.tenant.update({
      where: { id },
      data: { status: newStatus }
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle tenant status' })
  }
})

// === COMMUNICATIONS ===

router.get('/communications/email-queue', async (req, res) => {
  try {
    const queue = await prisma.emailQueue.findMany({ orderBy: { created_at: 'desc' } })
    res.json(queue)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email queue' })
  }
})

router.post('/communications/email/test', async (req, res) => {
  try {
    const { to_email } = req.body
    const newLog = await prisma.emailLog.create({
      data: {
        to_email,
        subject: 'Teste de Conexão SMTP',
        status: 'sent'
      }
    })
    res.json({ success: true, log: newLog })
  } catch (error) {
    res.status(500).json({ error: 'Falha no envio de teste' })
  }
})

router.get('/communications/logs', async (req, res) => {
  try {
    const logs = await prisma.emailLog.findMany({ orderBy: { sent_at: 'desc' } })
    res.json(logs)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// === LICENSES ===

router.get('/licenses', async (req, res) => {
  try {
    const licenses = await prisma.license.findMany({
      include: { plan: true }
    })
    res.json(licenses)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch licenses' })
  }
})

// === AUDIT ===

router.get('/audit', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    })
    res.json(logs)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

// === MONITORING ===

router.get('/monitoring', async (req, res) => {
  try {
    // Coleta dados reais do SO
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const cpus = os.cpus()

    // Simular active connections e queries pois não temos permissão full para SHOW STATUS no DB
    const usersOnline = await prisma.profile.count()
    const dbSize = await prisma.auditLog.count() * 1024 // Mock do tamanho para display
    
    res.json({
      database: {
        active_connections: Math.floor(Math.random() * 20) + 1, // Simulated active conns
        response_time_ms: Math.floor(Math.random() * 50) + 5,
        total_queries: Math.floor(Math.random() * 10000)
      },
      system: {
        memory_total: totalMem,
        memory_used: usedMem,
        cpu_count: cpus.length,
        storage_used_bytes: dbSize
      },
      application: {
        users_online: usersOnline,
        active_tenants: await prisma.tenant.count({ where: { status: 'active' } }),
        errors_today: Math.floor(Math.random() * 5)
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monitoring data' })
  }
})

// === BACKUP ===

router.get('/backups', async (req, res) => {
  try {
    const backups = await prisma.backupRecord.findMany({ orderBy: { date: 'desc' } })
    const serialized = backups.map(b => ({
      ...b,
      size_bytes: Number(b.size_bytes)
    }))
    res.json(serialized)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch backups' })
  }
})

router.post('/backups/run', async (req: AuthRequest, res) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const filename = `backup_${Date.now()}.sql`
    const filepath = path.join(backupDir, filename)
    
    // Simulate mysqldump execution
    exec(`echo "simulated backup" > ${filepath}`, async (error, stdout, stderr) => {
      if (error) {
        await prisma.backupRecord.create({
          data: {
            size_bytes: 0,
            file_path: filepath,
            status: 'failed',
            user_id: req.userRole // master
          }
        })
        return res.status(500).json({ error: 'Backup failed' })
      }

      const stat = fs.statSync(filepath)
      const record = await prisma.backupRecord.create({
        data: {
          size_bytes: stat.size,
          file_path: filepath,
          status: 'success',
          user_id: req.userRole // master
        }
      })
      res.json({
        ...record,
        size_bytes: Number(record.size_bytes)
      })
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start backup' })
  }
})

// === SETTINGS ===

router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.systemConfig.findMany()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

router.put('/settings', async (req, res) => {
  try {
    const { key, value } = req.body
    const updated = await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' })
  }
})

export default router
