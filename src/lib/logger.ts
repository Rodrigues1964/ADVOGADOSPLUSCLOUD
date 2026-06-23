// src/lib/logger.ts

import winston from 'winston';

// Lista de chaves cujos valores devem ser sanitizados nos logs.
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'authorization',
  'cookie',
  'jwt',
  'secret',
]);

/**
 * Formatter customizado do Winston para sanitizar dados sensíveis.
 * Ele percorre recursivamente o objeto de metadados do log e substitui
 * os valores de chaves sensíveis por '[REDACTED]'.
 */
const sanitizeFormat = winston.format((info) => {
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
          sanitizedObj[key] = '[REDACTED]';
        } else {
          sanitizedObj[key] = sanitize(obj[key]);
        }
      }
    }
    return sanitizedObj;
  };

  return sanitize(info);
});

const isProduction = process.env.NODE_ENV === 'production';

// Define os formatos para desenvolvimento e produção
const devFormat = winston.format.combine(
  winston.format.errors({ stack: true }), // Garante que o stack trace de erros seja logado
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  sanitizeFormat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Formata a metadata para ser mais legível no console de desenvolvimento
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

const prodFormat = winston.format.combine(
  winston.format.errors({ stack: true }), // Garante que o stack trace de erros seja logado
  winston.format.timestamp(),
  sanitizeFormat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? prodFormat : devFormat,
  // Adiciona metadados padrão a todos os logs, como o nome do serviço.
  // Isso é extremamente útil para filtrar logs em uma plataforma centralizada.
  defaultMeta: {
    service: 'advogados-plus-cloud-server',
  },
  transports: [new winston.transports.Console()],
});

logger.info(`Logger inicializado em modo: ${isProduction ? 'production' : 'development'}`);

export { logger };