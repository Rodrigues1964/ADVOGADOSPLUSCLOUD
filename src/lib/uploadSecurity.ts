// Motor de Segurança para Validação de Upload de Arquivos
// Implementa checagem de whitelist de extensões/MIME, limite de tamanho,
// sanitização de nomes (path traversal) e validação binária de magic bytes.

// Importa o módulo 'path' para manipulação segura de nomes de arquivo
import path from 'path';
import { Readable } from 'stream';

export interface UploadValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedName?: string;
}

// Configurações Globais de Upload
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx'];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Mapeamento de assinaturas binárias (Magic Bytes) para tipos de arquivo
const MAGIC_BYTES_SIGNATURES = new Map<string, { mime: string, signature: string }>([
  ['.pdf',   { mime: 'application/pdf', signature: '25504446' }],
  ['.png',   { mime: 'image/png', signature: '89504E47' }],
  ['.jpg',   { mime: 'image/jpeg', signature: 'FFD8FF' }],
  ['.jpeg',  { mime: 'image/jpeg', signature: 'FFD8FF' }],
  ['.docx',  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: '504B0304' }],
  ['.xlsx',  { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', signature: '504B0304' }],
]);

// Sanitizador de Nome do Arquivo para evitar Path Traversal e injeções
export function sanitizeFileName(name: string): string {
  // 1. [SEGURO] Usa path.basename para extrair o nome do arquivo, prevenindo Path Traversal.
  const baseName = path.basename(name);
  
  // 2. Extrai a extensão de forma segura.
  const ext = path.extname(baseName).toLowerCase();
  const nameWithoutExt = path.basename(baseName, ext);
  
  // 3. Sanitiza o corpo do nome: remove caracteres não permitidos e normaliza espaços/sublinhados.
  const cleanName = nameWithoutExt
    .replace(/[^a-zA-Z0-9-]/g, '_') // Permite apenas alfanuméricos e hífen, o resto vira _
    .replace(/_+/g, '_') // Junta múltiplos sublinhados
    .replace(/^_|_$/g, ''); // Remove sublinhados no início ou fim
    
  // Garante que o nome não fique vazio após a sanitização.
  const finalName = cleanName || 'arquivo_sem_nome';

  return `${finalName}${ext}`;
}

// Leitor assíncrono dos primeiros bytes do arquivo para Magic Numbers
async function getFileHeaderHex(file: File, byteCount: number): Promise<string> {
  // [SEGURO] Usa file.stream() que é mais adequado e seguro para ambientes Node.js
  if (!file.stream) {
    throw new Error('Ambiente não suporta file.stream().');
  }

  const stream = file.stream();
  const reader = stream.getReader();
  let bytesRead = 0;
  const chunks: Uint8Array[] = [];

  while (bytesRead < byteCount) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    bytesRead += value.length;
  }

  reader.releaseLock();

  if (chunks.length === 0) {
    return '';
  }

  // Concatena os chunks e pega apenas os bytes necessários
  const buffer = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  const headerBytes = buffer.slice(0, byteCount);
  return Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
}

// Validador Principal do Upload de Arquivo
export async function validateUploadedFile(file: File): Promise<UploadValidationResult> {
  // 1. Validar se o arquivo é nulo
  if (!file) {
    return { isValid: false, error: 'Nenhum arquivo fornecido.' };
  }

  // 2. Validar Limitação de Tamanho (Ex: 5MB)
  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `O tamanho do arquivo excede o limite permitido de 5MB (Tamanho do arquivo: ${(file.size / (1024 * 1024)).toFixed(2)}MB).` 
    };
  }

  // 3. Validar Extensão do Arquivo
  const lastDotIdx = file.name.lastIndexOf('.');
  if (lastDotIdx === -1) {
    return { isValid: false, error: 'O arquivo não possui uma extensão válida.' };
  }
  const fileExt = file.name.substring(lastDotIdx).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return { isValid: false, error: `Extensão de arquivo não permitida (${fileExt}). Permite-se apenas PDF, PNG, JPG/JPEG, DOCX e XLSX.` };
  }

  // 4. Validar MIME Type do Arquivo
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { isValid: false, error: `MIME type de arquivo não permitido (${file.type || 'desconhecido'}).` };
  }

  // 5. Verificação do Conteúdo Real por Magic Bytes (Assinaturas Binárias)
  try {
    // Ler primeiros 8 bytes
    const headerHex = await getFileHeaderHex(file, 8);

    // [SEGURO] Bloqueio explícito de executáveis PE (iniciam com "MZ" - 4D5A em Hex)
    if (headerHex.startsWith('4D5A')) {
      return { isValid: false, error: 'Upload bloqueado: Arquivos executáveis não são permitidos por motivos de segurança.' };
    }

    // [SEGURO] Validação centralizada de Magic Bytes e consistência com MIME Type
    const expectedSignature = MAGIC_BYTES_SIGNATURES.get(fileExt);
    if (expectedSignature) {
      if (!headerHex.startsWith(expectedSignature.signature)) {
        return { isValid: false, error: `Falsificação de tipo de arquivo detectada: O arquivo se diz um '${fileExt}', mas seu conteúdo binário não corresponde.` };
      }
      // Checagem de consistência entre MIME type real e o esperado
      if (file.type !== expectedSignature.mime) {
        return { isValid: false, error: `Inconsistência de tipo de arquivo: O MIME type declarado (${file.type}) não corresponde ao tipo esperado para a extensão '${fileExt}'.` };
      }
    }
  } catch (err) {
    return { 
      isValid: false, 
      error: `Falha ao processar assinatura binária do arquivo: ${err instanceof Error ? err.message : String(err)}` 
    };
  }

  // 6. Sanitizar o nome do arquivo para gravação
  const sanitizedName = sanitizeFileName(file.name);

  return {
    isValid: true,
    sanitizedName
  };
}
