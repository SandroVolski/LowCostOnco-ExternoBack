// src/models/ChatOnkhos.ts - Modelo Simplificado para BD_ONKHOS

import { query } from '../config/database';

export interface Conversa {
  id?: number;
  operadora_id: number;
  clinica_id: number;
  nome_conversa: string;
  descricao?: string;
  ultima_mensagem_id?: number;
  ultima_mensagem_texto?: string;
  ultima_mensagem_data?: string;
  operadora_ultima_leitura?: string;
  clinica_ultima_leitura?: string;
  ativa: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Informações relacionadas
  operadora_nome?: string;
  clinica_nome?: string;
  mensagens_nao_lidas?: number;
}

export interface Mensagem {
  id?: number;
  conversa_id: number;
  remetente_id: number;
  remetente_tipo: 'operadora' | 'clinica';
  remetente_nome: string;
  conteudo: string;
  tipo_mensagem: 'texto' | 'imagem' | 'arquivo';
  status: 'enviada' | 'entregue' | 'lida';
  created_at?: string;
  updated_at?: string;
}

export interface ConversaCompleta extends Conversa {
  mensagens: Mensagem[];
}

export class ChatOnkhosModel {
  
  // =====================================================
  // CONVERSAS
  // =====================================================
  
  // Buscar ou criar conversa entre operadora e clínica
  static async findOrCreateConversa(operadoraId: number, clinicaId: number): Promise<Conversa> {
    try {
      // Primeiro, tentar encontrar conversa existente
      const existingQuery = `
        SELECT c.*, o.nome as operadora_nome, cl.nome as clinica_nome
        FROM conversas c
        JOIN operadoras o ON c.operadora_id = o.id
        JOIN clinicas cl ON c.clinica_id = cl.id
        WHERE c.operadora_id = ? AND c.clinica_id = ? AND c.ativa = TRUE
        LIMIT 1
      `;
      
      const existing = await query(existingQuery, [operadoraId, clinicaId]);
      
      if (existing.length > 0) {
        console.log('✅ Conversa existente encontrada:', existing[0].id);
        return existing[0];
      }
      
      // Se não existe, criar nova conversa
      console.log('🔧 Criando nova conversa entre operadora e clínica...');
      
      // Buscar nomes para a conversa
      const [operadoraResult, clinicaResult] = await Promise.all([
        query('SELECT nome FROM operadoras WHERE id = ?', [operadoraId]),
        query('SELECT nome FROM clinicas WHERE id = ?', [clinicaId])
      ]);
      
      const operadoraNome = operadoraResult[0]?.nome || 'Operadora';
      const clinicaNome = clinicaResult[0]?.nome || 'Clínica';
      
      const insertQuery = `
        INSERT INTO conversas (
          operadora_id, clinica_id, nome_conversa, descricao, ativa, created_at, updated_at
        ) VALUES (?, ?, ?, ?, TRUE, CONVERT_TZ(NOW(), '+00:00', '-03:00'), CONVERT_TZ(NOW(), '+00:00', '-03:00'))
      `;
      
      const values = [
        operadoraId,
        clinicaId,
        `${operadoraNome} - ${clinicaNome}`,
        `Chat entre ${operadoraNome} e ${clinicaNome}`
      ];
      
      const result = await query(insertQuery, values);
      const conversaId = result.insertId;
      
      console.log('✅ Conversa criada com ID:', conversaId);
      
      // Buscar a conversa recém-criada
      const newConversa = await this.getConversaById(conversaId);
      if (!newConversa) {
        throw new Error('Erro ao buscar conversa recém-criada');
      }
      
      return newConversa;
    } catch (error) {
      console.error('Erro ao buscar/criar conversa:', error);
      throw new Error('Erro ao buscar/criar conversa');
    }
  }
  
  // Buscar conversa por ID
  static async getConversaById(id: number): Promise<Conversa | null> {
    try {
      const selectQuery = `
        SELECT c.*, o.nome as operadora_nome, cl.nome as clinica_nome
        FROM conversas c
        JOIN operadoras o ON c.operadora_id = o.id
        JOIN clinicas cl ON c.clinica_id = cl.id
        WHERE c.id = ? AND c.ativa = TRUE
      `;
      
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar conversa por ID:', error);
      return null;
    }
  }
  
  // Buscar conversas de uma operadora
  static async getConversasOperadora(operadoraId: number): Promise<Conversa[]> {
    try {
      const selectQuery = `
        SELECT 
          c.*, 
          o.nome as operadora_nome, 
          cl.nome as clinica_nome,
          (SELECT COUNT(*) FROM mensagens m 
           WHERE m.conversa_id = c.id 
           AND m.remetente_tipo != 'operadora' 
           AND m.created_at > COALESCE(c.operadora_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas
        FROM conversas c
        JOIN operadoras o ON c.operadora_id = o.id
        JOIN clinicas cl ON c.clinica_id = cl.id
        WHERE c.operadora_id = ? AND c.ativa = TRUE
        ORDER BY c.ultima_mensagem_data DESC, c.created_at DESC
      `;
      
      const result = await query(selectQuery, [operadoraId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar conversas da operadora:', error);
      return [];
    }
  }

  // Buscar clínicas credenciadas de uma operadora
  static async getClinicasCredenciadas(operadoraId: number): Promise<any[]> {
    try {
      const selectQuery = `
        SELECT DISTINCT
          cl.id,
          cl.nome,
          cl.cnpj,
          cl.endereco,
          cl.telefone,
          cl.email,
          cl.ativa,
          c.id as conversa_id,
          c.nome_conversa,
          c.ultima_mensagem_texto,
          c.ultima_mensagem_data,
          (SELECT COUNT(*) FROM mensagens m 
           WHERE m.conversa_id = c.id 
           AND m.remetente_tipo != 'operadora' 
           AND m.created_at > COALESCE(c.operadora_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas
        FROM clinicas cl
        LEFT JOIN conversas c ON cl.id = c.clinica_id AND c.operadora_id = ? AND c.ativa = TRUE
        WHERE cl.operadora_id = ? AND cl.ativa = TRUE
        ORDER BY c.ultima_mensagem_data DESC NULLS LAST, cl.nome ASC
      `;
      
      const result = await query(selectQuery, [operadoraId, operadoraId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar clínicas credenciadas:', error);
      return [];
    }
  }
  
  // Buscar conversas de uma clínica
  static async getConversasClinica(clinicaId: number): Promise<Conversa[]> {
    try {
      const selectQuery = `
        SELECT 
          c.*, 
          o.nome as operadora_nome, 
          cl.nome as clinica_nome,
          (SELECT COUNT(*) FROM mensagens m 
           WHERE m.conversa_id = c.id 
           AND m.remetente_tipo != 'clinica' 
           AND m.created_at > COALESCE(c.clinica_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas
        FROM conversas c
        JOIN operadoras o ON c.operadora_id = o.id
        JOIN clinicas cl ON c.clinica_id = cl.id
        WHERE c.clinica_id = ? AND c.ativa = TRUE
        ORDER BY c.ultima_mensagem_data DESC, c.created_at DESC
      `;
      
      const result = await query(selectQuery, [clinicaId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar conversas da clínica:', error);
      return [];
    }
  }
  
  // Marcar conversa como lida
  static async marcarComoLida(conversaId: number, userId: number, userType: 'operadora' | 'clinica'): Promise<boolean> {
    try {
      const updateField = userType === 'operadora' ? 'operadora_ultima_leitura' : 'clinica_ultima_leitura';
      
      const updateQuery = `
        UPDATE conversas 
        SET ${updateField} = CONVERT_TZ(NOW(), '+00:00', '-03:00'), updated_at = CONVERT_TZ(NOW(), '+00:00', '-03:00') 
        WHERE id = ?
      `;
      
      const result = await query(updateQuery, [conversaId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao marcar conversa como lida:', error);
      return false;
    }
  }
  
  // =====================================================
  // MENSAGENS
  // =====================================================
  
  // Criar nova mensagem
  static async criarMensagem(mensagemData: {
    conversa_id: number;
    remetente_id: number;
    remetente_tipo: 'operadora' | 'clinica';
    remetente_nome: string;
    conteudo: string;
    tipo_mensagem?: 'texto' | 'imagem' | 'arquivo';
  }): Promise<Mensagem> {
    try {
      const insertQuery = `
        INSERT INTO mensagens (
          conversa_id, remetente_id, remetente_tipo, remetente_nome, 
          conteudo, tipo_mensagem, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CONVERT_TZ(NOW(), '+00:00', '-03:00'), CONVERT_TZ(NOW(), '+00:00', '-03:00'))
      `;
      
      const values = [
        mensagemData.conversa_id,
        mensagemData.remetente_id,
        mensagemData.remetente_tipo,
        mensagemData.remetente_nome,
        mensagemData.conteudo,
        mensagemData.tipo_mensagem || 'texto'
      ];
      
      console.log('🔧 [MODELO] Criando nova mensagem...', mensagemData);
      console.log('🔧 [MODELO] Query:', insertQuery);
      console.log('🔧 [MODELO] Valores:', values);
      
      const result = await query(insertQuery, values);
      const mensagemId = result.insertId;
      
      console.log('✅ Mensagem criada com ID:', mensagemId);
      
      // Buscar a mensagem recém-criada
      const newMensagem = await this.getMensagemById(mensagemId);
      if (!newMensagem) {
        throw new Error('Erro ao buscar mensagem recém-criada');
      }
      
      return newMensagem;
    } catch (error) {
      console.error('Erro ao criar mensagem:', error);
      throw new Error('Erro ao criar mensagem');
    }
  }
  
  // Buscar mensagem por ID
  static async getMensagemById(id: number): Promise<Mensagem | null> {
    try {
      const selectQuery = `
        SELECT * FROM mensagens WHERE id = ?
      `;
      
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar mensagem por ID:', error);
      return null;
    }
  }

  // Atualizar última mensagem da conversa
  static async atualizarUltimaMensagem(conversaId: number, mensagemId: number, conteudo: string): Promise<void> {
    try {
      const updateQuery = `
        UPDATE conversas 
        SET ultima_mensagem_id = ?, 
            ultima_mensagem_texto = ?, 
            ultima_mensagem_data = CONVERT_TZ(NOW(), '+00:00', '-03:00'),
            updated_at = CONVERT_TZ(NOW(), '+00:00', '-03:00')
        WHERE id = ?
      `;
      
      await query(updateQuery, [mensagemId, conteudo, conversaId]);
      console.log('✅ Última mensagem atualizada para conversa:', conversaId);
    } catch (error) {
      console.error('Erro ao atualizar última mensagem:', error);
    }
  }

  // Encontrar ou criar conversa entre operadora e clínica
  static async findOrCreateOperadoraClinicaChat(operadoraId: number, clinicaId: number): Promise<Conversa> {
    try {
      // Primeiro, tentar encontrar conversa existente
      const existingQuery = `
        SELECT * FROM conversas 
        WHERE operadora_id = ? AND clinica_id = ? AND ativa = 1
        LIMIT 1
      `;
      
      const existing = await query(existingQuery, [operadoraId, clinicaId]);
      
      if (existing.length > 0) {
        console.log('✅ Conversa existente encontrada:', existing[0].id);
        return existing[0];
      }
      
      // Se não existe, criar nova conversa
      const insertQuery = `
        INSERT INTO conversas (
          operadora_id, clinica_id, nome_conversa, descricao,
          ultima_mensagem_id, ultima_mensagem_texto, ultima_mensagem_data,
          operadora_ultima_leitura, clinica_ultima_leitura, ativa,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, 1, CONVERT_TZ(NOW(), '+00:00', '-03:00'), CONVERT_TZ(NOW(), '+00:00', '-03:00'))
      `;
      
      const nomeConversa = `Conversa Operadora-Clínica ${operadoraId}-${clinicaId}`;
      const descricao = `Chat entre operadora ID ${operadoraId} e clínica ID ${clinicaId}`;
      
      const result = await query(insertQuery, [operadoraId, clinicaId, nomeConversa, descricao]);
      const conversaId = result.insertId;
      
      // Buscar a conversa recém-criada
      const newConversa = await this.getConversaById(conversaId);
      if (!newConversa) {
        throw new Error('Erro ao buscar conversa recém-criada');
      }
      
      console.log('✅ Nova conversa criada:', conversaId);
      return newConversa;
    } catch (error) {
      console.error('Erro ao encontrar/criar conversa:', error);
      throw new Error('Erro ao encontrar/criar conversa');
    }
  }
  
  // Buscar mensagens de uma conversa
  static async getMensagensConversa(conversaId: number, limit: number = 50, offset: number = 0): Promise<Mensagem[]> {
    try {
      // Simplificar a query - usar valores fixos primeiro para testar
      const selectQuery = `
        SELECT * FROM mensagens 
        WHERE conversa_id = ? 
        ORDER BY created_at ASC 
        LIMIT 50 OFFSET 0
      `;
      
      console.log('🔧 [MODELO] Buscando mensagens:', { conversaId, limit, offset });
      console.log('🔧 [MODELO] Tipos:', { 
        conversaId: typeof conversaId, 
        limit: typeof limit, 
        offset: typeof offset 
      });
      
      // Usar apenas o conversaId por enquanto
      const conversaIdNum = Number(conversaId) || 0;
      const params = [conversaIdNum];
      
      console.log('🔧 [MODELO] Parâmetros processados:', params);
      console.log('🔧 [MODELO] Tipos dos parâmetros:', params.map(p => typeof p));
      
      const result = await query(selectQuery, params);
      console.log('✅ [MODELO] Resultado da query:', result.length, 'mensagens encontradas');
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens da conversa:', error);
      return [];
    }
  }
  
  // Buscar última mensagem de uma conversa
  static async getUltimaMensagem(conversaId: number): Promise<Mensagem | null> {
    try {
      const selectQuery = `
        SELECT * FROM mensagens 
        WHERE conversa_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await query(selectQuery, [conversaId]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar última mensagem:', error);
      return null;
    }
  }
  
  // Contar mensagens não lidas de um usuário
  static async countMensagensNaoLidas(userId: number, userType: 'operadora' | 'clinica'): Promise<number> {
    try {
      const selectQuery = `
        SELECT COUNT(*) as total
        FROM mensagens m
        JOIN conversas c ON m.conversa_id = c.id
        WHERE (
          (c.operadora_id = ? AND ? = 'operadora' AND m.remetente_tipo != 'operadora')
          OR
          (c.clinica_id = ? AND ? = 'clinica' AND m.remetente_tipo != 'clinica')
        )
        AND (
          (? = 'operadora' AND (c.operadora_ultima_leitura IS NULL OR m.created_at > c.operadora_ultima_leitura))
          OR
          (? = 'clinica' AND (c.clinica_ultima_leitura IS NULL OR m.created_at > c.clinica_ultima_leitura))
        )
      `;
      
      const result = await query(selectQuery, [userId, userType, userId, userType, userType, userType]);
      return result[0]?.total || 0;
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error);
      return 0;
    }
  }
  
  // Buscar conversa com mensagens
  static async getConversaComMensagens(conversaId: number): Promise<ConversaCompleta | null> {
    try {
      const conversa = await this.getConversaById(conversaId);
      if (!conversa) return null;
      
      const mensagens = await this.getMensagensConversa(conversaId);
      
      return {
        ...conversa,
        mensagens
      };
    } catch (error) {
      console.error('Erro ao buscar conversa com mensagens:', error);
      return null;
    }
  }
}
