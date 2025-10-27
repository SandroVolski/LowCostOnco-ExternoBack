import { Request, Response, NextFunction } from 'express';

// Armazenamento de rate limiting em memória
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configurações de rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 100; // Máximo de requisições por minuto
const MAX_REQUESTS_PER_WINDOW_STRICT = 30; // Máximo para operações pesadas

// Função para obter IP do cliente
const getClientIP = (req: Request): string => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection as any).socket?.remoteAddress || 
         'unknown';
};

// Função para limpar rate limit expirado
const cleanExpiredRateLimits = (): void => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Middleware de rate limiting básico
export const rateLimit = (maxRequests: number = MAX_REQUESTS_PER_WINDOW) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Limpar rate limits expirados periodicamente
    if (Math.random() < 0.05) { // 5% de chance de limpar
      cleanExpiredRateLimits();
    }
    
    const clientIP = getClientIP(req);
    const now = Date.now();
    const windowStart = now - (now % RATE_LIMIT_WINDOW);
    
    const key = `${clientIP}:${windowStart}`;
    const current = rateLimitStore.get(key);
    
    if (!current) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: windowStart + RATE_LIMIT_WINDOW
      });
    } else {
      current.count++;
      
      if (current.count > maxRequests) {
        console.log(`🚫 Rate limit excedido para IP: ${clientIP}`);
        return res.status(429).json({
          success: false,
          message: 'Muitas requisições. Tente novamente em alguns minutos.',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        });
      }
    }
    
    // Adicionar headers de rate limiting
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - (current?.count || 1)).toString());
    res.set('X-RateLimit-Reset', new Date(current?.resetTime || windowStart + RATE_LIMIT_WINDOW).toISOString());
    
    next();
  };
};

// Rate limiting mais restritivo para operações pesadas
export const strictRateLimit = rateLimit(MAX_REQUESTS_PER_WINDOW_STRICT);

// Rate limiting específico para uploads
export const uploadRateLimit = rateLimit(50); // Máximo 50 uploads por minuto

// Função para obter estatísticas de rate limiting
export const getRateLimitStats = () => {
  const now = Date.now();
  const activeLimits = Array.from(rateLimitStore.entries())
    .filter(([_, value]) => now < value.resetTime)
    .map(([key, value]) => ({
      key,
      count: value.count,
      resetTime: new Date(value.resetTime).toISOString()
    }));
  
  return {
    activeLimits,
    totalStored: rateLimitStore.size
  };
};

// Função para resetar rate limit de um IP específico
export const resetRateLimit = (ip: string): boolean => {
  const keys = Array.from(rateLimitStore.keys()).filter(key => key.startsWith(ip));
  keys.forEach(key => rateLimitStore.delete(key));
  
  console.log(`🔄 Rate limit resetado para IP: ${ip}`);
  return keys.length > 0;
}; 