import { Request, Response, NextFunction } from 'express';

// Cache simples em memória
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Configurações de cache
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em millisegundos
const MAX_CACHE_SIZE = 100; // Máximo de itens no cache

// Função para gerar chave do cache
const generateCacheKey = (req: Request): string => {
  const url = req.originalUrl || req.url;
  const method = req.method;
  const query = JSON.stringify(req.query);
  const params = JSON.stringify(req.params);
  
  return `${method}:${url}:${query}:${params}`;
};

// Função para limpar cache expirado
const cleanExpiredCache = (): void => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.ttl) {
      cache.delete(key);
    }
  }
  
  // Se o cache estiver muito grande, remover itens mais antigos
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
    toRemove.forEach(([key]) => cache.delete(key));
  }
};

// Middleware de cache para GET requests
export const cacheMiddleware = (ttl: number = CACHE_TTL) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Só aplicar cache para GET requests
    if (req.method !== 'GET') {
      return next();
    }
    // Nunca cachear requisições autenticadas (possuem Authorization)
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.trim() !== '') {
      return next();
    }
    
    // Limpar cache expirado periodicamente
    if (Math.random() < 0.1) { // 10% de chance de limpar
      cleanExpiredCache();
    }
    
    const cacheKey = generateCacheKey(req);
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return res.json(cached.data);
    }
    
    // Interceptar a resposta para armazenar no cache
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode === 200) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl
        });
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Função para invalidar cache
export const invalidateCache = (pattern?: string): void => {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Middleware para adicionar headers de cache
export const cacheHeaders = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.trim() !== '') {
    // Para respostas autenticadas, evitar cache em navegador e proxies
    res.set('Cache-Control', 'no-store');
    res.set('Vary', 'Authorization');
  } else {
    // Respostas públicas podem ter cache curto com ETag por URL
    res.set('Cache-Control', 'private, max-age=300'); // 5 minutos
    const stableTag = Buffer.from((req.originalUrl || req.url)).toString('base64');
    res.set('ETag', `W/"${stableTag}"`);
  }
  next();
};

// Função para obter estatísticas do cache
export const getCacheStats = () => {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL
  };
}; 