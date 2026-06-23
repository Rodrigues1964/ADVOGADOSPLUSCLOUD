// src/lib/auth.ts

import bcrypt from 'bcryptjs';

/**
 * Fator de custo para o Bcrypt.
 * Um fator de 12 é o recomendado atualmente como um bom equilíbrio
 * entre segurança e performance em hardware moderno.
 * Aumentar este valor torna o hash exponencialmente mais lento,
 * dificultando ataques de força bruta.
 */
const SALT_ROUNDS = 12;

/**
 * Gera um hash seguro para uma senha em texto plano.
 * Usa o algoritmo Bcrypt, que automaticamente gera e inclui um salt único.
 * @param plaintextPassword A senha original do usuário.
 * @returns Uma Promise que resolve para o hash da senha.
 */
export async function hashPassword(plaintextPassword: string): Promise<string> {
  if (!plaintextPassword) {
    throw new Error('A senha não pode ser vazia.');
  }
  const hash = await bcrypt.hash(plaintextPassword, SALT_ROUNDS);
  return hash;
}

/**
 * Compara uma senha em texto plano com um hash armazenado no banco de dados.
 * @param plaintextPassword A senha fornecida pelo usuário durante o login.
 * @param hashFromDatabase O hash que está salvo no banco de dados.
 * @returns Uma Promise que resolve para 'true' se a senha corresponder, 'false' caso contrário.
 */
export async function comparePassword(plaintextPassword: string, hashFromDatabase: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(plaintextPassword, hashFromDatabase);
  return isMatch;
}