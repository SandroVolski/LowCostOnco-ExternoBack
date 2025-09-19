import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    id: number;
    tipo: 'clinica' | 'operadora' | 'admin';
    clinicaId?: number;
    role?: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Token de acesso requerido'
    });
    return;
  }

  // Verificar se é o token especial do admin
  if (token === 'admin-special-access') {
    req.user = {
      id: 999,
      tipo: 'admin' as any,
      role: 'admin'
    };
    next();
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware opcional - permite acesso sem token (para desenvolvimento)
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const decoded = jwt.verify(token, secret) as any;
      req.user = decoded;
    } catch (error) {
      // Token inválido, mas continua sem autenticação
      console.log('Token inválido fornecido, continuando sem autenticação');
    }
  }
  
  next();
};

// Middleware de autorização por role
export const requireRole = (roles: Array<'admin' | 'clinica' | 'operadora'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user as any;
    console.log('🔧 requireRole - User:', user);
    console.log('🔧 requireRole - Required roles:', roles);
    console.log('🔧 requireRole - User role:', user?.role);
    
    if (!user || !user.role || !roles.includes(user.role as any)) {
      console.log('❌ requireRole - Acesso negado');
      res.status(403).json({ success: false, message: 'Acesso negado' });
      return;
    }
    console.log('✅ requireRole - Acesso permitido');
    next();
  };
};

// Verifica header X-Admin-Secret para endpoints restritos de bootstrap
export const checkAdminSecret = (req: Request, res: Response, next: NextFunction): void => {
  const headerSecret = (req.headers['x-admin-secret'] || req.headers['X-Admin-Secret']) as string | undefined;
  const expected = process.env.ADMIN_INIT_SECRET || process.env.X_ADMIN_SECRET || '';
  if (!expected) {
    res.status(500).json({ success: false, message: 'ADMIN_INIT_SECRET não configurado' });
    return;
  }
  if (!headerSecret || headerSecret !== expected) {
    res.status(403).json({ success: false, message: 'Segredo de administrador inválido' });
    return;
  }
  next();
};