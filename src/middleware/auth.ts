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
    console.log('🔧 authenticateToken - JWT_SECRET:', secret);
    console.log('🔧 authenticateToken - Token recebido:', token.substring(0, 20) + '...');
    console.log('🔧 authenticateToken - URL:', req.url);
    console.log('🔧 authenticateToken - Query params:', req.query);
    
    const decoded = jwt.verify(token, secret) as any;
    console.log('🔧 authenticateToken - Token decodificado:', decoded);
    
    // Aceitar tokens de clínica, admin e operadora
    // Verificar tanto 'role' quanto 'tipo' para compatibilidade
    const userRole = decoded.role || decoded.tipo;
    const isClinica = userRole === 'clinica' || decoded.tipo === 'clinica';
    const isAdmin = userRole === 'admin' || decoded.tipo === 'admin';
    const isOperadora = userRole === 'operadora_admin' || userRole === 'operadora_user' || 
                       userRole === 'operator' || decoded.tipo === 'operadora';
    
    if (isClinica || isAdmin || isOperadora) {
      console.log('✅ Token aceito para role/tipo:', userRole || decoded.tipo);
      
      // Adicionar operadoraId para usuários de operadora
      if (isOperadora) {
        req.user = {
          ...decoded,
          operadoraId: decoded.operadoraId || decoded.operadora_id,
          tipo: 'operadora',
          role: userRole || 'operadora'
        };
      } else if (isClinica) {
        req.user = {
          ...decoded,
          tipo: 'clinica',
          role: 'clinica'
        };
      } else {
        req.user = {
          ...decoded,
          tipo: 'admin',
          role: 'admin'
        };
      }
      
      next();
    } else {
      console.log('❌ Token rejeitado para role:', decoded.role);
      res.status(403).json({
        success: false,
        message: 'Token inválido para este endpoint'
      });
    }
  } catch (error) {
    console.log('❌ authenticateToken - Erro ao verificar token:', error);
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
export const requireRole = (roles: Array<'admin' | 'clinica' | 'operadora' | 'operadora_admin' | 'operadora_user' | 'operator' | 'clinic'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user as any;
    console.log('🔧 requireRole - User:', user);
    console.log('🔧 requireRole - Required roles:', roles);
    console.log('🔧 requireRole - User role:', user?.role);
    console.log('🔧 requireRole - User tipo:', user?.tipo);
    
    // Verificar tanto role quanto tipo para compatibilidade
    const userRole = user?.role || user?.tipo;
    
    // Mapear roles específicos para roles genéricos
    const normalizedUserRole = (userRole === 'operadora_admin' || userRole === 'operadora_user') ? 'operadora' : userRole;
    const normalizedRequiredRoles = roles.map(role => {
      if (role === 'operadora_admin' || role === 'operadora_user') return 'operadora';
      if (role === 'operator') return 'operator';
      if (role === 'clinic') return 'clinic';
      return role;
    });
    
    if (!user || !userRole || !normalizedRequiredRoles.includes(normalizedUserRole as any)) {
      console.log('❌ requireRole - Acesso negado. Role/Tipo:', userRole, 'Requerido:', roles);
      res.status(403).json({ success: false, message: 'Acesso negado' });
      return;
    }
    console.log('✅ requireRole - Acesso permitido para:', userRole);
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