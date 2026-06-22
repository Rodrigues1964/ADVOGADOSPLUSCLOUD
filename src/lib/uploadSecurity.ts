// Motor de Segurança para Validação de Upload de Arquivos
// Implementa checagem de whitelist de extensões/MIME, limite de tamanho,
// sanitização de nomes (path traversal) e validação binária de magic bytes.

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

// Sanitizador de Nome do Arquivo para evitar Path Traversal e injeções
export function sanitizeFileName(name: string): string {
  // 1. Extrair apenas o nome base (ignorar caminhos se houver)
  const baseName = name.replace(/^.*[\\/]/, '');
  
  // 2. Extrair a extensão
  const lastDotIdx = baseName.lastIndexOf('.');
  const ext = lastDotIdx !== -1 ? baseName.substring(lastDotIdx) : '';
  const nameWithoutExt = lastDotIdx !== -1 ? baseName.substring(0, lastDotIdx) : baseName;
  
  // 3. Sanitizar o corpo do nome: remover caracteres de travessia (..), barras (/ \),
  // caracteres não alfanuméricos e substituir espaços por sublinhados
  const cleanName = nameWithoutExt
    .replace(/\.\./g, '') // Remover travessia explícita
    .replace(/[\\/]/g, '') // Remover barras
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Substituir caracteres especiais por sublinhados
    .replace(/_+/g, '_'); // Juntar múltiplos sublinhados
    
  return `${cleanName}${ext.toLowerCase()}`;
}

// Leitor assíncrono dos primeiros bytes do arquivo para Magic Numbers
async function getFileHeaderHex(file: File, byteCount: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(e.target.result);
        const hex = Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0').toUpperCase())
          .join('');
        resolve(hex);
      } else {
        reject(new Error('Erro ao ler bytes do cabeçalho do arquivo.'));
      }
    };
    reader.onerror = () => reject(reader.error);
    
    // Ler apenas a porção inicial (slice) para otimizar desempenho
    const blob = file.slice(0, byteCount);
    reader.readAsArrayBuffer(blob);
  });
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

    // Bloqueio explícito de executáveis PE (iniciam com "MZ" - 4D5A em Hex)
    if (headerHex.startsWith('4D5A')) {
      return { isValid: false, error: 'Upload bloqueado: Arquivos executáveis não são permitidos por motivos de segurança.' };
    }

    // Validar assinaturas específicas de tipo de arquivo
    if (fileExt === '.pdf' && !headerHex.startsWith('25504446')) {
      return { isValid: false, error: 'Falsificação de tipo de arquivo detectada: O arquivo afirma ser um PDF, mas não possui a assinatura binária de um PDF.' };
    }

    if (fileExt === '.png' && !headerHex.startsWith('89504E47')) {
      return { isValid: false, error: 'Falsificação de tipo de arquivo detectada: O arquivo afirma ser um PNG, mas não possui a assinatura binária de um PNG.' };
    }

    if ((fileExt === '.jpg' || fileExt === '.jpeg') && !headerHex.startsWith('FFD8FF')) {
      return { isValid: false, error: 'Falsificação de tipo de arquivo detectada: O arquivo afirma ser um JPEG, mas não possui a assinatura binária de uma imagem JPEG.' };
    }

    // DOCX e XLSX são arquivos compactados ZIP em seu formato (iniciam com "PK" - 504B0304)
    if ((fileExt === '.docx' || fileExt === '.xlsx') && !headerHex.startsWith('504B0304')) {
      return { isValid: false, error: 'Falsificação de tipo de arquivo detectada: O arquivo afirma ser um documento do Office, mas seu cabeçalho binário está inválido.' };
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
