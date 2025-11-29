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

  private static async fetchConversaByIdRaw(id: number): Promise<Conversa | null> {
    try {
      const selectQuery = `
        SELECT 
          c.*, 
          o.nome AS operadora_nome, 
          cl.nome AS clinica_nome
        FROM conversas c
        JOIN operadoras o ON c.operadora_id = o.id
        JOIN clinicas cl ON c.clinica_id = cl.id
        WHERE c.id = ? AND c.ativa = TRUE
      `;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar conversa raw por ID:', error);
      return null;
    }
  }

  private static async atualizarOperadoraConversa(
    conversaId: number,
    clinicaId: number,
    novaOperadoraId: number
  ): Promise<Conversa | null> {
    try {
      const vinculoQuery = `
        SELECT 
          co.operadora_id,
          o.nome AS operadora_nome,
          cl.nome AS clinica_nome
        FROM clinicas_operadoras co
        JOIN operadoras o ON o.id = co.operadora_id
        JOIN clinicas cl ON cl.id = co.clinica_id
        WHERE 
          co.clinica_id = ? 
          AND co.operadora_id = ? 
          AND co.status = 'ativo'
        LIMIT 1
      `;

      const vinculo = await query(vinculoQuery, [clinicaId, novaOperadoraId]);
      if (vinculo.length === 0) {
        return null;
      }

      const { operadora_nome, clinica_nome } = vinculo[0];

      const updateQuery = `
        UPDATE conversas
        SET 
          operadora_id = ?, 
          nome_conversa = ?, 
          descricao = ?, 
          updated_at = CONVERT_TZ(NOW(), '+00:00', '-03:00')
        WHERE id = ?
      `;

      await query(updateQuery, [
        novaOperadoraId,
        `${operadora_nome} - ${clinica_nome}`,
        `Chat entre ${operadora_nome} e ${clinica_nome}`,
        conversaId
      ]);

      return await this.fetchConversaByIdRaw(conversaId);
    } catch (error) {
      console.error('Erro ao atualizar operadora da conversa:', error);
      return null;
    }
  }

  private static async ensureConversaIntegridade(conversa: Conversa): Promise<Conversa> {
    try {
      if (!conversa || !conversa.id) {
        return conversa;
      }

      const clinicaId = conversa.clinica_id;
      const operadoraId = conversa.operadora_id;

      if (!clinicaId) {
        return conversa;
      }

      if (operadoraId) {
        const vinculoAtual = await query(
          `
            SELECT 1 
            FROM clinicas_operadoras 
            WHERE clinica_id = ? 
              AND operadora_id = ? 
              AND status = 'ativo'
            LIMIT 1
          `,
          [clinicaId, operadoraId]
        );

        if (vinculoAtual.length > 0) {
          return conversa;
        }
      }

      const operadorasAtivas = await query(
        `
          SELECT operadora_id 
          FROM clinicas_operadoras 
          WHERE clinica_id = ? 
            AND status = 'ativo'
        `,
        [clinicaId]
      );

      if (!operadorasAtivas || operadorasAtivas.length === 0) {
        return conversa;
      }

      let novaOperadoraId: number | null = null;

      if (operadorasAtivas.length === 1) {
        novaOperadoraId = operadorasAtivas[0].operadora_id;
      } else {
        const ultimaMensagemOperadora = await query(
          `
            SELECT remetente_id 
            FROM mensagens 
            WHERE conversa_id = ? 
              AND remetente_tipo = 'operadora'
            ORDER BY created_at DESC, id DESC
            LIMIT 1
          `,
          [conversa.id]
        );

        if (ultimaMensagemOperadora.length > 0) {
          const candidato = ultimaMensagemOperadora[0].remetente_id;
          const candidatoValido = operadorasAtivas.some(
            (op: any) => op.operadora_id === candidato
          );

          if (candidatoValido) {
            novaOperadoraId = candidato;
          }
        }
      }

      if (!novaOperadoraId && !operadoraId) {
        novaOperadoraId = operadorasAtivas[0].operadora_id;
      }

      if (novaOperadoraId && novaOperadoraId !== operadoraId) {
        const conversaAtualizada = await this.atualizarOperadoraConversa(
          conversa.id,
          clinicaId,
          novaOperadoraId
        );

        if (conversaAtualizada) {
          return conversaAtualizada;
        }
      }

      return conversa;
    } catch (error) {
      console.error('Erro ao validar integridade da conversa:', error);
      return conversa;
    }
  }
  
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
        return existing[0];
      }

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
      const conversa = await this.fetchConversaByIdRaw(id);
      if (!conversa) {
        return null;
      }
      return await this.ensureConversaIntegridade(conversa);
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
      const conversasComIntegridade = await Promise.all(
        result.map(async (conversa: any) => {
          const corrigida = await this.ensureConversaIntegridade(conversa);
          return { ...conversa, ...corrigida };
        })
      );
      return conversasComIntegridade;
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
          cl.id AS clinica_id,
          cl.nome,
          cl.cnpj,
          cl.endereco,
          cl.telefone,
          cl.email,
          cl.ativa,
          c.id as conversa_id,
          c.operadora_id,
          c.nome_conversa,
          c.descricao,
          c.ultima_mensagem_id,
          c.ultima_mensagem_texto,
          c.ultima_mensagem_data,
          c.operadora_ultima_leitura,
          c.clinica_ultima_leitura,
          c.ativa AS conversa_ativa,
          (SELECT COUNT(*) FROM mensagens m 
           WHERE m.conversa_id = c.id 
           AND m.remetente_tipo != 'operadora' 
           AND m.created_at > COALESCE(c.operadora_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas
        FROM clinicas_operadoras co
        JOIN clinicas cl ON cl.id = co.clinica_id
        LEFT JOIN conversas c 
          ON c.clinica_id = co.clinica_id 
         AND c.operadora_id = co.operadora_id 
         AND c.ativa = TRUE
        WHERE co.operadora_id = ? 
          AND co.status = 'ativo'
          AND cl.ativa = TRUE
        ORDER BY 
          CASE WHEN c.ultima_mensagem_data IS NULL THEN 1 ELSE 0 END,
          c.ultima_mensagem_data DESC,
          cl.nome ASC
      `;
      
      const result = await query(selectQuery, [operadoraId]);
      const dados = await Promise.all(
        result.map(async (item: any) => {
          let conversaInfo: Conversa | null = null;

          if (item.conversa_id) {
            conversaInfo = await this.getConversaById(item.conversa_id);
          } else {
            conversaInfo = await this.findOrCreateConversa(operadoraId, item.clinica_id);
          }

          const mensagensNaoLidas =
            item.conversa_id && item.mensagens_nao_lidas !== null
              ? item.mensagens_nao_lidas
              : 0;

          return {
            clinica_id: item.clinica_id,
            nome: item.nome,
            cnpj: item.cnpj,
            endereco: item.endereco,
            telefone: item.telefone,
            email: item.email,
            clinica_ativa: item.ativa,
            ativa: conversaInfo?.ativa ?? item.conversa_ativa ?? true,
            id: conversaInfo?.id ?? item.conversa_id,
            conversa_id: conversaInfo?.id ?? item.conversa_id,
            operadora_id: conversaInfo?.operadora_id ?? item.operadora_id ?? operadoraId,
            clinica_nome: conversaInfo?.clinica_nome ?? item.nome,
            operadora_nome: conversaInfo?.operadora_nome,
            nome_conversa: conversaInfo?.nome_conversa,
            descricao: conversaInfo?.descricao,
            ultima_mensagem_id: conversaInfo?.ultima_mensagem_id,
            ultima_mensagem_texto: conversaInfo?.ultima_mensagem_texto,
            ultima_mensagem_data: conversaInfo?.ultima_mensagem_data,
            operadora_ultima_leitura: conversaInfo?.operadora_ultima_leitura,
            clinica_ultima_leitura: conversaInfo?.clinica_ultima_leitura,
            ativa_conversa: conversaInfo?.ativa ?? item.conversa_ativa,
            mensagens_nao_lidas: mensagensNaoLidas
          };
        })
      );
      return dados;
    } catch (error) {
      console.error('Erro ao buscar clínicas credenciadas:', error);
      return [];
    }
  }
  
  // Buscar conversas de uma clínica
  static async getConversasClinica(clinicaId: number): Promise<Conversa[]> {
    try {
      // Primeiro, buscar operadoras vinculadas à clínica via clinicas_operadoras
      const operadorasVinculadasQuery = `
        SELECT DISTINCT co.operadora_id
        FROM clinicas_operadoras co
        WHERE co.clinica_id = ? AND co.status = 'ativo'
      `;
      const operadorasVinculadas = await query(operadorasVinculadasQuery, [clinicaId]);

      // Criar conversas automaticamente para operadoras vinculadas que ainda não têm conversa
      for (const op of operadorasVinculadas) {
        const checkQuery = `SELECT id FROM conversas WHERE clinica_id = ? AND operadora_id = ?`;
        const existingConversation = await query(checkQuery, [clinicaId, op.operadora_id]);
        
        if (existingConversation.length === 0) {
          // Criar conversa automaticamente
          const insertQuery = `
            INSERT INTO conversas (clinica_id, operadora_id, ativa, created_at, updated_at)
            VALUES (?, ?, TRUE, CONVERT_TZ(NOW(), '+00:00', '-03:00'), CONVERT_TZ(NOW(), '+00:00', '-03:00'))
          `;
          await query(insertQuery, [clinicaId, op.operadora_id]);
        }
      }

      // Buscar todas as conversas da clínica
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
      const conversasCorrigidas = await Promise.all(
        result.map(async (conversa: any) => {
          const corrigida = await this.ensureConversaIntegridade(conversa);
          return { ...conversa, ...corrigida };
        })
      );
      return conversasCorrigidas;
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

      const result = await query(insertQuery, values);
      const mensagemId = result.insertId;

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
        return existing[0];
      }

      // Buscar nomes reais da operadora e clínica
      const operadoraQuery = `SELECT nome FROM operadoras WHERE id = ? LIMIT 1`;
      const clinicaQuery = `SELECT nome FROM clinicas WHERE id = ? LIMIT 1`;
      
      const operadoraResult = await query(operadoraQuery, [operadoraId]);
      const clinicaResult = await query(clinicaQuery, [clinicaId]);
      
      const operadoraNome = operadoraResult.length > 0 ? operadoraResult[0].nome : `Operadora ${operadoraId}`;
      const clinicaNome = clinicaResult.length > 0 ? clinicaResult[0].nome : `Clínica ${clinicaId}`;
      
      // Se não existe, criar nova conversa
      const insertQuery = `
        INSERT INTO conversas (
          operadora_id, clinica_id, nome_conversa, descricao,
          ultima_mensagem_id, ultima_mensagem_texto, ultima_mensagem_data,
          operadora_ultima_leitura, clinica_ultima_leitura, ativa,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, 1, CONVERT_TZ(NOW(), '+00:00', '-03:00'), CONVERT_TZ(NOW(), '+00:00', '-03:00'))
      `;

      const nomeConversa = `${operadoraNome} - ${clinicaNome}`;
      const descricao = `Chat entre ${operadoraNome} e ${clinicaNome}`;

      const result = await query(insertQuery, [operadoraId, clinicaId, nomeConversa, descricao]);
      const conversaId = result.insertId;

      // Buscar a conversa recém-criada
      const newConversa = await this.getConversaById(conversaId);
      if (!newConversa) {
        throw new Error('Erro ao buscar conversa recém-criada');
      }

      return newConversa;
    } catch (error) {
      console.error('Erro ao encontrar/criar conversa:', error);
      throw new Error('Erro ao encontrar/criar conversa');
    }
  }
  
  // Buscar mensagens de uma conversa (respeita limit/offset)
  static async getMensagensConversa(conversaId: number, limit: number = 50, offset: number = 0): Promise<Mensagem[]> {
    try {
      const selectQuery = `
        SELECT * FROM mensagens 
        WHERE conversa_id = ? 
        ORDER BY created_at ASC 
        LIMIT ? OFFSET ?
      `;
      const result = await query(selectQuery, [Number(conversaId) || 0, Number(limit) || 50, Number(offset) || 0]);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens da conversa:', error);
      return [];
    }
  }

  // Buscar últimas N mensagens (mais recentes primeiro, depois reordenar no controller)
  static async getMensagensRecentes(conversaId: number, limit: number = 50, offset: number = 0): Promise<Mensagem[]> {
    try {
      const conv = Number(conversaId) || 0;
      const lim = Math.max(1, Math.min(500, Number(limit) || 50));
      const off = Math.max(0, Number(offset) || 0);
      const selectQuery = `
        SELECT * FROM mensagens 
        WHERE conversa_id = ? 
        ORDER BY created_at DESC 
        LIMIT ${lim} OFFSET ${off}
      `;
      const result = await query(selectQuery, [conv]);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens recentes da conversa:', error);
      return [];
    }
  }

  // Buscar mensagens após um determinado ID (para polling incremental)
  static async getMensagensAposId(conversaId: number, lastId: number, max: number = 200): Promise<Mensagem[]> {
    try {
      const conv = Number(conversaId) || 0;
      const last = Math.max(0, Number(lastId) || 0);
      const lim = Math.max(1, Math.min(500, Number(max) || 200));
      const selectQuery = `
        SELECT * FROM mensagens 
        WHERE conversa_id = ? AND id > ?
        ORDER BY created_at ASC 
        LIMIT ${lim}
      `;
      const result = await query(selectQuery, [conv, last]);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens após ID:', error);
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
