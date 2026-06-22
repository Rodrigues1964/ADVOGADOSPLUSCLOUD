import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados MariaDB...')

  // Clean the database
  console.log('Limpando banco de dados...')
  await prisma.auditLog.deleteMany()
  await prisma.whatsAppLog.deleteMany()
  await prisma.financialTransaction.deleteMany()
  await prisma.document.deleteMany()
  await prisma.hearing.deleteMany()
  await prisma.task.deleteMany()
  await prisma.case.deleteMany()
  await prisma.client.deleteMany()
  await prisma.tenantMember.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.profile.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  console.log('Criando Tenants...')
  const t1 = await prisma.tenant.create({
    data: { id: 't-1', name: 'Rodrigues & Associados', slug: 'rodrigues-advogados', plan_type: 'premium', subscription_status: 'active', status: 'active', billing_email: 'financeiro@rodrigues.adv.br' }
  })
  const t2 = await prisma.tenant.create({
    data: { id: 't-2', name: 'Silva Advocacia', slug: 'silva-advocacia', plan_type: 'free', subscription_status: 'trialing', status: 'active', billing_email: 'mariana@silva.adv.br' }
  })

  console.log('Criando Perfis...')
  const u1 = await prisma.profile.create({
    data: { id: 'u-1', first_name: 'Dr. Carlos', last_name: 'Rodrigues', email: 'carlos@rodrigues.adv.br', phone: '(11) 98765-4321', avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', password_hash: passwordHash }
  })
  const u2 = await prisma.profile.create({
    data: { id: 'u-2', first_name: 'Dra. Mariana', last_name: 'Silva', email: 'mariana@rodrigues.adv.br', phone: '(11) 99999-8888', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', password_hash: passwordHash }
  })
  const u3 = await prisma.profile.create({
    data: { id: 'u-3', first_name: 'Eduardo', last_name: 'Santos', email: 'eduardo@cliente.com.br', phone: '(11) 95555-4444', password_hash: passwordHash }
  })
  const uMaster = await prisma.profile.create({
    data: { id: 'u-master', first_name: 'Admin', last_name: 'MASTER', email: 'master@advogadosplus.com', phone: '(00) 00000-0000', password_hash: passwordHash }
  })

  console.log('Criando Membros...')
  await prisma.tenantMember.createMany({
    data: [
      { id: 'm-1', tenant_id: t1.id, profile_id: u1.id, role: 'owner' },
      { id: 'm-2', tenant_id: t1.id, profile_id: u2.id, role: 'lawyer' },
      { id: 'm-3', tenant_id: t1.id, profile_id: u3.id, role: 'client' },
      { id: 'm-4', tenant_id: t2.id, profile_id: u2.id, role: 'owner' },
      { id: 'm-master', tenant_id: t1.id, profile_id: uMaster.id, role: 'master' }
    ]
  })

  console.log('Criando Clientes...')
  const c1 = await prisma.client.create({
    data: { id: 'c-1', tenant_id: t1.id, type: 'corporate', name: 'Construtora Alfa Ltda', email: 'financeiro@alfa.com.br', phone: '(11) 98765-4321', document: '12.345.678/0001-90', rg_ie: 'ISENTO', address_street: 'Av. Paulista', address_number: '1000', address_neighborhood: 'Bela Vista', address_city: 'São Paulo', address_state: 'SP', address_zipcode: '01310-100', notes: 'Cliente corporativo com recorrência mensal de consultoria.' }
  })
  const c2 = await prisma.client.create({
    data: { id: 'c-2', tenant_id: t1.id, type: 'individual', name: 'Eduardo Santos', email: 'eduardo@cliente.com.br', phone: '(11) 95555-4444', document: '123.456.789-00', rg_ie: '12.345.678-9', address_street: 'Rua das Flores', address_number: '123', address_neighborhood: 'Jardins', address_city: 'São Paulo', address_state: 'SP', address_zipcode: '01234-567', notes: 'Processo cível de indenização por atraso de voo.' }
  })
  const c3 = await prisma.client.create({
    data: { id: 'c-3', tenant_id: t1.id, type: 'individual', name: 'Maria de Souza', email: 'maria.souza@gmail.com', phone: '(21) 98888-7777', document: '987.654.321-11', rg_ie: '98.765.432-1', address_street: 'Av. Atlântica', address_number: '456', address_neighborhood: 'Copacabana', address_city: 'Rio de Janeiro', address_state: 'RJ', address_zipcode: '22020-002', notes: 'Reclamação trabalhista.' }
  })

  console.log('Criando Processos...')
  const ca1 = await prisma.case.create({
    data: { id: 'ca-1', tenant_id: t1.id, client_id: c1.id, title: 'Revisional de Contrato de Aluguel', number: '5001234-56.2026.8.26.0100', court: 'TJSP', instance: '1ª Instância', distribution_date: new Date('2026-02-15'), value: 150000, status: 'active', description: 'Revisão do valor de aluguel comercial do galpão em Guarulhos.', responsible_lawyer_id: u1.id }
  })
  const ca2 = await prisma.case.create({
    data: { id: 'ca-2', tenant_id: t1.id, client_id: c2.id, title: 'Indenização por Danos Morais (Aéreo)', number: '0012456-78.2026.8.19.0001', court: 'TJRJ', instance: '1ª Instância', distribution_date: new Date('2026-04-10'), value: 25000, status: 'active', description: 'Cancelamento de voo internacional sem assistência material.', responsible_lawyer_id: u2.id }
  })
  const ca3 = await prisma.case.create({
    data: { id: 'ca-3', tenant_id: t1.id, client_id: c3.id, title: 'Ação Trabalhista - Horas Extras', number: '1000852-12.2026.5.02.0002', court: 'TRT2', instance: '1ª Instância', distribution_date: new Date('2026-01-20'), value: 85000, status: 'suspended', description: 'Cobrança de horas extras acumuladas e reflexos nas verbas rescisórias.', responsible_lawyer_id: u1.id }
  })
  const ca4 = await prisma.case.create({
    data: { id: 'ca-4', tenant_id: t1.id, client_id: c1.id, title: 'Execução de Título Extrajudicial', number: '5012345-89.2025.8.26.0100', court: 'TJSP', instance: '2ª Instância', distribution_date: new Date('2025-08-12'), value: 320000, status: 'settled', description: 'Execução de contrato de fornecimento inadimplido pela devedora.', responsible_lawyer_id: u2.id }
  })

  console.log('Criando Tarefas...')
  await prisma.task.createMany({
    data: [
      { id: 'tk-1', tenant_id: t1.id, case_id: ca1.id, title: 'Elaborar Réplica à Contestação', description: 'Manifestar-se sobre os documentos juntados pelo réu na contestação do aluguel.', due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), status: 'todo', priority: 'high', assigned_to: u1.id },
      { id: 'tk-2', tenant_id: t1.id, case_id: ca2.id, title: 'Juntar Procuração e Guia de Custas', description: 'Regularizar a representação processual do cliente e recolher taxa inicial.', due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), status: 'in_progress', priority: 'urgent', assigned_to: u2.id },
      { id: 'tk-3', tenant_id: t1.id, case_id: ca3.id, title: 'Auditar documentos demissionais', description: 'Revisar termos de rescisão e extratos de FGTS enviados pelo cliente.', due_date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000), status: 'todo', priority: 'medium', assigned_to: u1.id },
      { id: 'tk-4', tenant_id: t1.id, title: 'Enviar relatório de contingência', description: 'Enviar relatório atualizado dos processos ativos para o diretor financeiro da Construtora Alfa.', due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'completed', priority: 'low', assigned_to: u2.id }
    ]
  })

  console.log('Criando Audiências...')
  await prisma.hearing.createMany({
    data: [
      { id: 'h-1', tenant_id: t1.id, case_id: ca1.id, date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), location: 'Sala Virtual 04 - TJSP (Teams)', status: 'scheduled', notes: 'Audiência de Instrução e Julgamento. Necessário alinhar depoimento da testemunha com o cliente.' },
      { id: 'h-2', tenant_id: t1.id, case_id: ca3.id, date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), location: 'Tribunal Regional do Trabalho SP - Sala 12', status: 'scheduled', notes: 'Audiência de Conciliação. Proposta máxima para acordo autorizada: R$ 15.000,00.' }
    ]
  })

  console.log('Criando Financeiro...')
  await prisma.financialTransaction.createMany({
    data: [
      { id: 'f-1', tenant_id: t1.id, case_id: ca1.id, client_id: c1.id, type: 'income', category: 'honorarios', amount: 5000, due_date: new Date('2026-06-05'), payment_date: new Date('2026-06-05'), status: 'paid', description: 'Honorários Pro Labore - Revisional Comercial' },
      { id: 'f-2', tenant_id: t1.id, case_id: ca1.id, client_id: c1.id, type: 'income', category: 'honorarios', amount: 15000, due_date: new Date('2026-07-05'), status: 'pending', description: 'Honorários Êxito (Fase de Sentença)' },
      { id: 'f-3', tenant_id: t1.id, case_id: ca2.id, client_id: c2.id, type: 'income', category: 'honorarios', amount: 3500, due_date: new Date('2026-05-15'), payment_date: new Date('2026-05-14'), status: 'paid', description: 'Honorários Iniciais - Atraso Aéreo' },
      { id: 'f-4', tenant_id: t1.id, case_id: ca4.id, client_id: c1.id, type: 'income', category: 'honorarios', amount: 24000, due_date: new Date('2026-04-10'), payment_date: new Date('2026-04-10'), status: 'paid', description: 'Honorários de Acordo Extrajudicial - Construtora Alfa' },
      { id: 'f-5', tenant_id: t1.id, case_id: ca1.id, type: 'expense', category: 'custas', amount: 450, due_date: new Date('2026-06-12'), payment_date: new Date('2026-06-12'), status: 'paid', description: 'Custas de Distribuição Iniciais' },
      { id: 'f-6', tenant_id: t1.id, type: 'expense', category: 'aluguel', amount: 1200, due_date: new Date('2026-06-10'), payment_date: new Date('2026-06-09'), status: 'paid', description: 'Aluguel do Coworking' },
      { id: 'f-7', tenant_id: t1.id, type: 'expense', category: 'despesas', amount: 150, due_date: new Date('2026-06-25'), status: 'pending', description: 'Mensalidade do Software de Monitoramento Jurídico' },
      { id: 'f-8', tenant_id: t1.id, type: 'expense', category: 'salarios', amount: 3800, due_date: new Date('2026-06-30'), status: 'pending', description: 'Pró-Labore Assistente e Paralegal' }
    ]
  })

  console.log('Criando Documentos...')
  await prisma.document.createMany({
    data: [
      { id: 'd-1', tenant_id: t1.id, case_id: ca1.id, name: 'Contrato_Locacao_Galpao_Assinado.pdf', file_path: 'documents/t-1/ca-1/contrato.pdf', file_size: 2450000, mime_type: 'application/pdf', uploaded_by: u1.id, created_at: new Date('2026-02-16T10:00:00Z') },
      { id: 'd-2', tenant_id: t1.id, case_id: ca2.id, name: 'Bilhete_Aereo_e_Comprovante_Atraso.pdf', file_path: 'documents/t-1/ca-2/bilhete.pdf', file_size: 1120000, mime_type: 'application/pdf', uploaded_by: u2.id, created_at: new Date('2026-04-12T14:30:00Z') }
    ]
  })

  console.log('Criando Logs WhatsApp...')
  await prisma.whatsAppLog.createMany({
    data: [
      { id: 'w-1', tenant_id: t1.id, client_id: c2.id, phone: '5511955554444', message_text: 'Olá Eduardo, informamos que a sua guia de custas foi devidamente protocolada e o processo está em andamento sob o número 0012456-78.2026.8.19.0001.', status: 'sent', sent_at: new Date('2026-06-18T10:15:00Z') }
    ]
  })

  console.log('Seed realizado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
