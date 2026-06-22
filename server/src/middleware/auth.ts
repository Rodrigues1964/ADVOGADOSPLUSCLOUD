// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/prismaClient';

// Types for extended request
export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  officeId?: string;
}

/**
 * Middleware to verify JWT and attach user info to the request.
 * Expects the token in the Authorization header as `Bearer <token>`.
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token not provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      role: string;
      officeId?: string;
    };
    req.userId = payload.userId;
    req.userRole = payload.role;
    req.officeId = payload.officeId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Middleware to enforce multi‑tenant isolation.
 * - MASTER role bypasses office filtering.
 * - All other roles must have an officeId and the request will attach it.
 */
export const tenantFilter = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole === 'master') {
    // Super admin can access any data; no office restriction
    return next();
  }
  if (!req.officeId) {
    return res.status(403).json({ message: 'Office context missing' });
  }
  // Optionally, you could verify that the user actually belongs to the office
  // via a lightweight DB check (cached). For performance we assume token is correct.
  next();
};

/**
 * Helper to check if the user has one of the required roles.
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({ message: 'Role not found' });
    }
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};
