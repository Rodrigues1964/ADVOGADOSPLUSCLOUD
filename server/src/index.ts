import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth'
import casesRoutes from './routes/cases'
import clientsRoutes from './routes/clients'
import tasksRoutes from './routes/tasks'
import financialsRouter from './routes/financials'
import documentsRouter from './routes/documents'
import hearingsRouter from './routes/hearings'
import masterRouter from './routes/master'
import analyticsRoutes from './routes/analytics'

dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/cases', casesRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/financials', financialsRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/hearings', hearingsRouter)
app.use('/api/master', masterRouter)
app.use('/api/analytics', analyticsRoutes)

// Root Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Advogados Plus rodando!' })
})

// Tenants Endpoint
app.get('/api/tenants', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany()
    res.json(tenants)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tenants' })
  }
})

app.listen(PORT, () => {
  console.log(`[Servidor] Rodando na porta ${PORT}`)
})
