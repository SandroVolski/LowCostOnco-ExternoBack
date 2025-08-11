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
    
    // Limpar cache expirado periodicamente
    if (Math.random() < 0.1) { // 10% de chance de limpar
      cleanExpiredCache();
    }
    
    const cacheKey = generateCacheKey(req);
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('📦 Cache hit:', cacheKey);
      return res.json(cached.data);
    }
    
    // Interceptar a resposta para armazenar no cache
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode === 200) {
        console.log('💾 Armazenando no cache:', cacheKey);
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
    console.log('🗑️ Cache completamente limpo');
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
  console.log(`🗑️ Cache limpo para padrão: ${pattern}`);
};

// Middleware para adicionar headers de cache
export const cacheHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Adicionar headers para controle de cache no navegador
  res.set('Cache-Control', 'private, max-age=300'); // 5 minutos
  // ETag estável por rota + query (melhor para 304)
  // Usa um hash simples da URL; em produção, prefira um hash do body
  const stableTag = Buffer.from((req.originalUrl || req.url)).toString('base64');
  res.set('ETag', `W/"${stableTag}"`);
  
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