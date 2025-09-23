// src/models/Clinica.ts - VERSÃO CORRIGIDA

import { query } from '../config/database';
import { 
  Clinica, 
  ClinicaCreateInput, 
  ClinicaUpdateInput,
  ResponsavelTecnico,
  ResponsavelTecnicoCreateInput,
  ResponsavelTecnicoUpdateInput,
  ClinicaProfile
} from '../types/clinic';

// Função auxiliar para migrar dados antigos para o novo formato
const migrateContactData = (clinica: any): Clinica => {
  // Se já tem os novos campos, retorna como está
  if (clinica.telefones || clinica.emails) {
    return clinica;
  }
  
  // Migrar dados antigos para o novo formato
  const migratedClinica = { ...clinica };
  
  // Migrar telefone antigo para array
  if (clinica.telefone && !clinica.telefones) {
    migratedClinica.telefones = [clinica.telefone];
  } else if (!clinica.telefones) {
    migratedClinica.telefones = [''];
  }
  
  // Migrar email antigo para array
  if (clinica.email && !clinica.emails) {
    migratedClinica.emails = [clinica.email];
  } else if (!clinica.emails) {
    migratedClinica.emails = [''];
  }
  
  return migratedClinica;
};

// Função auxiliar para preparar dados para inserção/atualização
const prepareContactData = (clinicaData: any): any => {
  const prepared = { ...clinicaData };
  
  // Converter arrays de telefones e emails para JSON
  if (prepared.telefones && Array.isArray(prepared.telefones)) {
    prepared.telefones = JSON.stringify(prepared.telefones);
  }
  
  if (prepared.emails && Array.isArray(prepared.emails)) {
    prepared.emails = JSON.stringify(prepared.emails);
  }
  
  return prepared;
};

// Função auxiliar para processar dados vindos do banco
const processContactData = (clinica: any): Clinica => {
  const processed = { ...clinica };
  
  // Converter JSON de telefones para array
  if (clinica.telefones && typeof clinica.telefones === 'string') {
    try {
      processed.telefones = JSON.parse(clinica.telefones);
    } catch (error) {
      console.warn('Erro ao processar telefones JSON:', error);
      processed.telefones = [clinica.telefones];
    }
  } else if (!clinica.telefones) {
    processed.telefones = [''];
  }
  
  // Converter JSON de emails para array
  if (clinica.emails && typeof clinica.emails === 'string') {
    try {
      processed.emails = JSON.parse(clinica.emails);
    } catch (error) {
      console.warn('Erro ao processar emails JSON:', error);
      processed.emails = [clinica.emails];
    }
  } else if (!clinica.emails) {
    processed.emails = [''];
  }
  
  return migrateContactData(processed);
};

// 🆕 DADOS MOCK PARA DESENVOLVIMENTO (quando banco não estiver disponível)
const mockClinicas: Clinica[] = [
  {
    id: 1,
    nome: 'Clínica OncoLife',
    codigo: 'ONC001',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Flores, 123',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234-567',
    telefones: ['(11) 99999-9999', '(11) 88888-8888'],
    emails: ['contato@oncolife.com.br', 'admin@oncolife.com.br'],
    website: 'www.oncolife.com.br',
    status: 'ativo',
    created_at: '2024-01-15'
  },
  {
    id: 2,
    nome: 'Centro de Oncologia Avançada',
    codigo: 'COA002',
    cnpj: '98.765.432/0001-10',
    endereco: 'Av. Paulista, 1000',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01310-100',
    telefones: ['(11) 77777-7777'],
    emails: ['contato@coa.com.br'],
    status: 'ativo',
    created_at: '2024-02-20'
  }
];

export class ClinicaModel {
  
  // Buscar clínica por ID com responsáveis técnicos
  static async findById(id: number): Promise<ClinicaProfile | null> {
    try {
      // Tentar usar banco real primeiro
      const clinicQuery = `
        SELECT * FROM Clinicas WHERE id = ?
      `;
      const clinicResult = await query(clinicQuery, [id]);
      
      if (clinicResult.length === 0) {
        return null;
      }
      
      const clinica = processContactData(clinicResult[0]);
      
      // Buscar responsáveis técnicos
      const responsaveisQuery = `
        SELECT * FROM Responsaveis_Tecnicos 
        WHERE clinica_id = ? AND status = 'ativo'
        ORDER BY created_at ASC
      `;
      const responsaveis = await query(responsaveisQuery, [id]);
      
      return {
        clinica,
        responsaveis_tecnicos: responsaveis
      };
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      
      // Fallback para dados mock
      const clinica = mockClinicas.find(c => c.id === id);
      if (!clinica) return null;
      
      return {
        clinica,
        responsaveis_tecnicos: []
      };
    }
  }
  
  // Buscar clínica por código
  static async findByCode(codigo: string): Promise<Clinica | null> {
    try {
      const selectQuery = `SELECT * FROM Clinicas WHERE codigo = ?`;
      const result = await query(selectQuery, [codigo]);
      return result.length > 0 ? processContactData(result[0]) : null;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      return mockClinicas.find(c => c.codigo === codigo) || null;
    }
  }
  
  // Buscar clínica por usuário (para login)
  static async findByUser(usuario: string): Promise<Clinica | null> {
    try {
      const selectQuery = `SELECT * FROM Clinicas WHERE usuario = ?`;
      const result = await query(selectQuery, [usuario]);
      return result.length > 0 ? processContactData(result[0]) : null;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      return mockClinicas.find(c => c.usuario === usuario) || null;
    }
  }
  
  // Criar nova clínica
  static async create(clinicaData: ClinicaCreateInput): Promise<Clinica> {
    try {
      const preparedData = prepareContactData(clinicaData);
      
      const insertQuery = `
        INSERT INTO Clinicas (
          nome, codigo, cnpj, endereco, cidade, estado, cep,
          telefones, emails, website, logo_url, observacoes,
          usuario, senha, status, operadora_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        clinicaData.nome,
        clinicaData.codigo,
        clinicaData.cnpj || null,
        clinicaData.endereco || null,
        clinicaData.cidade || null,
        clinicaData.estado || null,
        clinicaData.cep || null,
        preparedData.telefones || null,
        preparedData.emails || null,
        clinicaData.website || null,
        clinicaData.logo_url || null,
        clinicaData.observacoes || null,
        clinicaData.usuario || null,
        clinicaData.senha || null,
        clinicaData.status || 'ativo',
        // incluir vínculo se enviado
        (clinicaData as any).operadora_id || null
      ];
      
      console.log('🔧 Criando nova clínica...');
      console.log('📋 Dados preparados:', {
        nome: clinicaData.nome,
        codigo: clinicaData.codigo,
        telefones: preparedData.telefones,
        emails: preparedData.emails
      });
      
      const result = await query(insertQuery, values);
      const insertId = result.insertId;
      
      console.log('✅ Clínica criada com ID:', insertId);
      
      // Buscar a clínica recém-criada
      const novaClinica = await this.findByIdSimple(insertId);
      if (!novaClinica) {
        throw new Error('Erro ao buscar clínica recém-criada');
      }
      
      return novaClinica;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      
      // Fallback para dados mock
      const novaClinica: Clinica = {
        ...clinicaData,
        id: Date.now(),
        created_at: new Date().toISOString().split('T')[0],
        status: clinicaData.status || 'ativo'
      };
      
      // Adicionar à lista mock
      mockClinicas.push(novaClinica);
      
      return novaClinica;
    }
  }
  
  // Atualizar clínica
  static async update(id: number, clinicaData: ClinicaUpdateInput): Promise<Clinica | null> {
    try {
      const preparedData = prepareContactData(clinicaData);
      
      // Construir query dinâmica baseada nos campos fornecidos
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(preparedData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const updateQuery = `
        UPDATE Clinicas 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      console.log('🔧 Atualizando clínica ID:', id);
      console.log('📋 Campos a atualizar:', updateFields);
      console.log('📋 Valores:', values);
      
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null; // Clínica não encontrada
      }
      
      console.log('✅ Clínica atualizada com sucesso');
      
      // Buscar a clínica atualizada
      return await this.findByIdSimple(id);
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      
      // Fallback para dados mock
      const clinicaIndex = mockClinicas.findIndex(c => c.id === id);
      if (clinicaIndex === -1) return null;
      
      const clinicaAtualizada = {
        ...mockClinicas[clinicaIndex],
        ...clinicaData,
        updated_at: new Date().toISOString().split('T')[0]
      };
      
      mockClinicas[clinicaIndex] = clinicaAtualizada;
      return clinicaAtualizada;
    }
  }
  
  // Buscar clínica por ID (versão simples, sem responsáveis técnicos)
  private static async findByIdSimple(id: number): Promise<Clinica | null> {
    try {
      const selectQuery = `SELECT * FROM Clinicas WHERE id = ?`;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? processContactData(result[0]) : null;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      return mockClinicas.find(c => c.id === id) || null;
    }
  }
  
  // Verificar se código já existe
  static async checkCodeExists(codigo: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `SELECT id FROM Clinicas WHERE codigo = ?`;
      let params: any[] = [codigo];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      return mockClinicas.some(c => c.codigo === codigo && c.id !== excludeId);
    }
  }
  
  // Verificar se usuário já existe
  static async checkUserExists(usuario: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `SELECT id FROM Clinicas WHERE usuario = ?`;
      let params: any[] = [usuario];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      return mockClinicas.some(c => c.usuario === usuario && c.id !== excludeId);
    }
  }

  // 🆕 MÉTODOS ADMINISTRATIVOS

  // Buscar todas as clínicas
  static async findAll(): Promise<Clinica[]> {
    try {
      console.log('🔧 Tentando conectar com banco real...');
      
      const selectQuery = `
        SELECT * FROM Clinicas 
        ORDER BY nome ASC
      `;
      
      console.log('🔧 Executando query:', selectQuery);
      const result = await query(selectQuery);
      
      console.log(`✅ ${result.length} clínicas encontradas no banco real`);
      
      // Processar dados de contato para cada clínica
      return result.map((clinica: any) => processContactData(clinica));
    } catch (error) {
      console.error('❌ ERRO DETALHADO ao conectar com banco:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        code: (error as any)?.code,
        errno: (error as any)?.errno,
        sqlState: (error as any)?.sqlState,
        sqlMessage: (error as any)?.sqlMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      console.warn('⚠️ Usando dados mock como fallback');
      return [...mockClinicas];
    }
  }

  // Deletar clínica (soft delete)
  static async delete(id: number): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE Clinicas 
        SET status = 'inativo', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = await query(updateQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      
      // Fallback para dados mock
      const clinicaIndex = mockClinicas.findIndex(c => c.id === id);
      if (clinicaIndex === -1) return false;
      
      mockClinicas[clinicaIndex].status = 'inativo';
      mockClinicas[clinicaIndex].updated_at = new Date().toISOString().split('T')[0];
      return true;
    }
  }

  // Buscar clínicas por operadora
  static async findByOperadoraId(operadoraId: number): Promise<Clinica[]> {
    try {
      const selectQuery = `
        SELECT id, nome, codigo, cnpj, endereco, cidade, estado, cep, 
               telefone, telefones, email, emails, website, logo_url, 
               observacoes, usuario, status, created_at, updated_at
        FROM Clinicas 
        WHERE operadora_id = ? AND status = 'ativo'
        ORDER BY nome ASC
      `;
      
      const result = await query(selectQuery, [operadoraId]);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar clínicas por operadora:', error);
      throw new Error('Erro ao buscar clínicas por operadora');
    }
  }
}

// Modelo para Responsáveis Técnicos
export class ResponsavelTecnicoModel {
  
  // Criar responsável técnico
  static async create(responsavelData: ResponsavelTecnicoCreateInput): Promise<ResponsavelTecnico> {
    try {
      const insertQuery = `
        INSERT INTO Responsaveis_Tecnicos (
          clinica_id, nome, crm, especialidade, telefone, email, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        responsavelData.clinica_id,
        responsavelData.nome,
        responsavelData.crm,
        responsavelData.especialidade,
        responsavelData.telefone || null,
        responsavelData.email || null,
        responsavelData.status || 'ativo'
      ];
      
      const result = await query(insertQuery, values);
      const insertId = result.insertId;
      
      // Buscar o responsável recém-criado
      const newResponsavel = await this.findById(insertId);
      if (!newResponsavel) {
        throw new Error('Erro ao buscar responsável recém-criado');
      }
      
      return newResponsavel;
    } catch (error) {
      console.error('Erro ao criar responsável técnico:', error);
      throw new Error('Erro ao criar responsável técnico');
    }
  }
  
  // Buscar responsável por ID
  static async findById(id: number): Promise<ResponsavelTecnico | null> {
    try {
      const selectQuery = `SELECT * FROM Responsaveis_Tecnicos WHERE id = ?`;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar responsável por ID:', error);
      throw new Error('Erro ao buscar responsável');
    }
  }
  
  // Buscar responsáveis por clínica
  static async findByClinicaId(clinicaId: number): Promise<ResponsavelTecnico[]> {
    try {
      const selectQuery = `
        SELECT * FROM Responsaveis_Tecnicos 
        WHERE clinica_id = ? AND status = 'ativo'
        ORDER BY created_at ASC
      `;
      const result = await query(selectQuery, [clinicaId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar responsáveis da clínica:', error);
      throw new Error('Erro ao buscar responsáveis');
    }
  }
  
  // ✅ MÉTODO CORRIGIDO - Atualizar responsável técnico
  static async update(id: number, responsavelData: ResponsavelTecnicoUpdateInput): Promise<ResponsavelTecnico | null> {
    try {
      // ✅ CORREÇÃO: Filtrar campos que NÃO devem ser atualizados
      const fieldsToExclude = ['id', 'clinica_id', 'created_at', 'updated_at'];
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(responsavelData).forEach(([key, value]) => {
        if (value !== undefined && !fieldsToExclude.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }
      
      const updateQuery = `
        UPDATE Responsaveis_Tecnicos 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      values.push(id);
      
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null;
      }
      
      // Buscar o responsável atualizado
      return await this.findById(id);
    } catch (error) {
      console.error('Erro ao atualizar responsável:', error);
      throw new Error('Erro ao atualizar responsável');
    }
  }
  
  // Deletar responsável técnico (soft delete)
  static async delete(id: number): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE Responsaveis_Tecnicos 
        SET status = 'inativo', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = await query(updateQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar responsável:', error);
      throw new Error('Erro ao deletar responsável');
    }
  }
  
  // Verificar se CRM já existe na clínica
  static async checkCrmExists(clinicaId: number, crm: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `
        SELECT id FROM Responsaveis_Tecnicos 
        WHERE clinica_id = ? AND crm = ? AND status = 'ativo'
      `;
      let params: any[] = [clinicaId, crm];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar CRM:', error);
      throw new Error('Erro ao verificar CRM');
    }
  }

  // Contar clínicas
  static async count(where?: any): Promise<number> {
    try {
      let queryStr = 'SELECT COUNT(*) as count FROM Clinicas';
      const params: any[] = [];

      if (where) {
        const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        queryStr += ` WHERE ${conditions}`;
        params.push(...Object.values(where));
      }

      const result = await query(queryStr, params);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar clínicas:', error);
      return 0;
    }
  }
}