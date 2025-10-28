import { Request, Response, NextFunction } from 'express';

export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    // Validação simples do token admin
    // TODO: Implementar JWT para admin se necessário
    if (token !== 'admin-special-access') {
      return res.status(403).json({ message: 'Acesso negado: token inválido' });
    }

    // Token válido, continuar
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Erro na autenticação admin' });
  }
}
