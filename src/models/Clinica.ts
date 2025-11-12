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
  
  // Processar endereco_completo (JSON) - NOVA ESTRUTURA
  if (clinica.endereco_completo) {
    try {
      const enderecoObj = typeof clinica.endereco_completo === 'string'
        ? JSON.parse(clinica.endereco_completo)
        : clinica.endereco_completo;
      // Suportar ambas estruturas: antiga (endereco) e nova (rua, numero, bairro, complemento)
      if (enderecoObj.rua || enderecoObj.numero || enderecoObj.bairro) {
        // Nova estrutura desmembrada
        processed.endereco_rua = enderecoObj.rua || '';
        processed.endereco_numero = enderecoObj.numero || '';
        processed.endereco_bairro = enderecoObj.bairro || '';
        processed.endereco_complemento = enderecoObj.complemento || '';
      } else if (enderecoObj.endereco) {
        // Estrutura antiga (compatibilidade)
        processed.endereco = enderecoObj.endereco || '';
      }
      processed.cidade = enderecoObj.cidade || '';
      processed.estado = enderecoObj.estado || '';
      processed.cep = enderecoObj.cep || '';
    } catch (error) {
      console.warn('Erro ao processar endereco_completo JSON:', error);
    }
  }
  
  // Processar contatos (JSON) - NOVA ESTRUTURA POR SETORES
  if (clinica.contatos) {
    try {
      const contatosObj = typeof clinica.contatos === 'string'
        ? JSON.parse(clinica.contatos)
        : clinica.contatos;
      
      // Verificar se é a nova estrutura (por setores) ou antiga (arrays simples)
      if (contatosObj.pacientes || contatosObj.administrativos || contatosObj.legais || 
          contatosObj.faturamento || contatosObj.financeiro) {
        // Nova estrutura por setores
        processed.contatos_pacientes = contatosObj.pacientes || { telefones: [''], emails: [''] };
        processed.contatos_administrativos = contatosObj.administrativos || { telefones: [''], emails: [''] };
        processed.contatos_legais = contatosObj.legais || { telefones: [''], emails: [''] };
        processed.contatos_faturamento = contatosObj.faturamento || { telefones: [''], emails: [''] };
        processed.contatos_financeiro = contatosObj.financeiro || { telefones: [''], emails: [''] };
      } else {
        // Estrutura antiga (compatibilidade)
        processed.telefones = contatosObj.telefones || [];
        processed.emails = contatosObj.emails || [];
      }
    } catch (error) {
      console.warn('Erro ao processar contatos JSON:', error);
      processed.telefones = [];
      processed.emails = [];
    }
  } else {
    // Fallback: tentar ler telefones e emails diretamente (compatibilidade)
    if (clinica.telefones && typeof clinica.telefones === 'string') {
      try {
        processed.telefones = JSON.parse(clinica.telefones);
      } catch (error) {
        processed.telefones = [clinica.telefones];
      }
    } else if (!clinica.telefones) {
      processed.telefones = [];
    }
    
    if (clinica.emails && typeof clinica.emails === 'string') {
      try {
        processed.emails = JSON.parse(clinica.emails);
      } catch (error) {
        processed.emails = [clinica.emails];
      }
    } else if (!clinica.emails) {
      processed.emails = [];
    }
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
        SELECT * FROM clinicas WHERE id = ?
      `;
      const clinicResult = await query(clinicQuery, [id]);
      
      if (clinicResult.length === 0) {
        return null;
      }
      
      const clinica = processContactData(clinicResult[0]);
      
      // Buscar responsáveis técnicos (novo schema) - busca TODOS, ativos e inativos
      const responsaveisQuery = `
        SELECT * FROM responsaveis_tecnicos 
        WHERE clinica_id = ?
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
      const selectQuery = `SELECT * FROM clinicas WHERE codigo = ?`;
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
      const selectQuery = `SELECT * FROM clinicas WHERE usuario = ?`;
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
      // Preparar endereco_completo como JSON - NOVA ESTRUTURA
      const enderecoCompleto = JSON.stringify({
        rua: clinicaData.endereco_rua || '',
        numero: clinicaData.endereco_numero || '',
        bairro: clinicaData.endereco_bairro || '',
        complemento: clinicaData.endereco_complemento || '',
        cidade: clinicaData.cidade || '',
        estado: clinicaData.estado || '',
        cep: clinicaData.cep || ''
      });

      // Preparar contatos como JSON - NOVA ESTRUTURA POR SETORES
      // Se telefones e emails vieram do frontend, usar para pacientes
      const contatosPacientes = clinicaData.telefones && clinicaData.emails 
        ? { telefones: clinicaData.telefones, emails: clinicaData.emails }
        : (clinicaData.contatos_pacientes || { telefones: [''], emails: [''] });

      const contatos = JSON.stringify({
        pacientes: contatosPacientes,
        administrativos: clinicaData.contatos_administrativos || { telefones: [''], emails: [''] },
        legais: clinicaData.contatos_legais || { telefones: [''], emails: [''] },
        faturamento: clinicaData.contatos_faturamento || { telefones: [''], emails: [''] },
        financeiro: clinicaData.contatos_financeiro || { telefones: [''], emails: [''] }
      });

      const insertQuery = `
        INSERT INTO clinicas (
          nome, razao_social, codigo, cnpj, endereco_completo, contatos,
          website, logo_url, observacoes,
          usuario, senha, status, operadora_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        clinicaData.nome,
        clinicaData.razao_social || null,
        clinicaData.codigo,
        clinicaData.cnpj || null,
        enderecoCompleto,
        contatos,
        clinicaData.website || null,
        clinicaData.logo_url || null,
        clinicaData.observacoes || null,
        clinicaData.usuario || null,
        clinicaData.senha || null,
        clinicaData.status || 'ativo',
        clinicaData.operadora_id || null
      ];

      const result = await query(insertQuery, values);
      const insertId = result.insertId;

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
      // Construir query dinâmica baseada nos campos fornecidos
      const updateFields: string[] = [];
      const values: any[] = [];

      // Campos simples
      if (clinicaData.nome !== undefined) {
        updateFields.push('nome = ?');
        values.push(clinicaData.nome);
      }
      if (clinicaData.razao_social !== undefined) {
        updateFields.push('razao_social = ?');
        values.push(clinicaData.razao_social);
      }
      if (clinicaData.codigo !== undefined) {
        updateFields.push('codigo = ?');
        values.push(clinicaData.codigo);
      }
      if (clinicaData.cnpj !== undefined) {
        updateFields.push('cnpj = ?');
        values.push(clinicaData.cnpj);
      }
      if (clinicaData.website !== undefined) {
        updateFields.push('website = ?');
        values.push(clinicaData.website);
      }
      if (clinicaData.logo_url !== undefined) {
        updateFields.push('logo_url = ?');
        values.push(clinicaData.logo_url);
      }
      if (clinicaData.observacoes !== undefined) {
        updateFields.push('observacoes = ?');
        values.push(clinicaData.observacoes);
      }
      if (clinicaData.usuario !== undefined) {
        updateFields.push('usuario = ?');
        values.push(clinicaData.usuario);
      }
      if (clinicaData.senha !== undefined) {
        updateFields.push('senha = ?');
        values.push(clinicaData.senha);
      }
      if (clinicaData.status !== undefined) {
        updateFields.push('status = ?');
        values.push(clinicaData.status);
      }
      if (clinicaData.operadora_id !== undefined) {
        updateFields.push('operadora_id = ?');
        values.push(clinicaData.operadora_id);
      }

      // Processar endereco_completo como JSON - NOVA ESTRUTURA
      if (clinicaData.endereco_rua !== undefined || clinicaData.endereco_numero !== undefined || 
          clinicaData.endereco_bairro !== undefined || clinicaData.endereco_complemento !== undefined ||
          clinicaData.cidade !== undefined || clinicaData.estado !== undefined || clinicaData.cep !== undefined) {
        const enderecoCompleto = JSON.stringify({
          rua: clinicaData.endereco_rua || '',
          numero: clinicaData.endereco_numero || '',
          bairro: clinicaData.endereco_bairro || '',
          complemento: clinicaData.endereco_complemento || '',
          cidade: clinicaData.cidade || '',
          estado: clinicaData.estado || '',
          cep: clinicaData.cep || ''
        });
        updateFields.push('endereco_completo = ?');
        values.push(enderecoCompleto);
      }

      // Processar contatos como JSON - NOVA ESTRUTURA POR SETORES
      if (clinicaData.contatos_pacientes !== undefined || clinicaData.contatos_administrativos !== undefined ||
          clinicaData.contatos_legais !== undefined || clinicaData.contatos_faturamento !== undefined ||
          clinicaData.contatos_financeiro !== undefined || clinicaData.telefones !== undefined || 
          clinicaData.emails !== undefined) {
        
        // Se telefones e emails vieram do frontend, usar para pacientes
        const contatosPacientes = clinicaData.telefones && clinicaData.emails 
          ? { telefones: clinicaData.telefones, emails: clinicaData.emails }
          : (clinicaData.contatos_pacientes || { telefones: [''], emails: [''] });
        
        const contatos = JSON.stringify({
          pacientes: contatosPacientes,
          administrativos: clinicaData.contatos_administrativos || { telefones: [''], emails: [''] },
          legais: clinicaData.contatos_legais || { telefones: [''], emails: [''] },
          faturamento: clinicaData.contatos_faturamento || { telefones: [''], emails: [''] },
          financeiro: clinicaData.contatos_financeiro || { telefones: [''], emails: [''] }
        });
        updateFields.push('contatos = ?');
        values.push(contatos);
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      updateFields.push('updated_at = NOW()');
      values.push(id);

      const updateQuery = `
        UPDATE clinicas 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      const result = await query(updateQuery, values);

      if (result.affectedRows === 0) {
        return null; // Clínica não encontrada
      }

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
      const selectQuery = `SELECT * FROM clinicas WHERE id = ?`;
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
      let checkQuery = `SELECT id FROM clinicas WHERE codigo = ?`;
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
      let checkQuery = `SELECT id FROM clinicas WHERE usuario = ?`;
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
      const selectQuery = `
        SELECT * FROM clinicas 
        ORDER BY nome ASC
      `;

      const result = await query(selectQuery);

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
        SELECT * FROM clinicas 
        WHERE operadora_id = ? AND status = 'ativo'
        ORDER BY nome ASC
      `;

      const result = await query(selectQuery, [operadoraId]);

      // Processar dados de contato para cada clínica
      return result.map((clinica: any) => processContactData(clinica));
    } catch (error) {
      console.error('❌ Erro ao buscar clínicas por operadora:', error);
      throw new Error('Erro ao buscar clínicas por operadora');
    }
  }
}

// Modelo para Responsáveis Técnicos
export class ResponsavelTecnicoModel {
  
  // Criar responsável técnico (novo schema: tabela 'responsaveis_tecnicos')
  static async create(responsavelData: ResponsavelTecnicoCreateInput): Promise<ResponsavelTecnico> {
    try {
      const insertQuery = `
        INSERT INTO responsaveis_tecnicos (
          clinica_id, nome, tipo_profissional, registro_conselho, uf_registro,
          especialidade_principal, rqe_principal, especialidade_secundaria, rqe_secundaria,
          cnes, telefone, email, responsavel_tecnico, operadoras_habilitadas, 
          documentos, status, crm, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const values = [
        responsavelData.clinica_id,
        responsavelData.nome,
        responsavelData.tipo_profissional,
        responsavelData.registro_conselho,
        responsavelData.uf_registro,
        responsavelData.especialidade_principal,
        responsavelData.rqe_principal || null,
        responsavelData.especialidade_secundaria || null,
        responsavelData.rqe_secundaria || null,
        responsavelData.cnes,
        responsavelData.telefone || null,
        responsavelData.email || null,
        responsavelData.responsavel_tecnico,
        responsavelData.operadoras_habilitadas ? JSON.stringify(responsavelData.operadoras_habilitadas) : null,
        responsavelData.documentos ? JSON.stringify(responsavelData.documentos) : null,
        responsavelData.status || 'ativo',
        // Alguns esquemas antigos exigem 'crm' NOT NULL: use registro_conselho como fallback
        (responsavelData as any).crm || responsavelData.registro_conselho
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
  
  // Buscar responsável por ID (novo schema)
  static async findById(id: number): Promise<ResponsavelTecnico | null> {
    try {
      const selectQuery = `SELECT * FROM responsaveis_tecnicos WHERE id = ?`;
      const result = await query(selectQuery, [id]);
      if (result.length === 0) return null;
      
      const responsavel = result[0];
      
      // Processar campos JSON
      if (responsavel.operadoras_habilitadas && typeof responsavel.operadoras_habilitadas === 'string') {
        try {
          responsavel.operadoras_habilitadas = JSON.parse(responsavel.operadoras_habilitadas);
        } catch (error) {
          console.warn('Erro ao processar operadoras_habilitadas JSON:', error);
          responsavel.operadoras_habilitadas = [];
        }
      }
      
      if (responsavel.documentos && typeof responsavel.documentos === 'string') {
        try {
          responsavel.documentos = JSON.parse(responsavel.documentos);
        } catch (error) {
          console.warn('Erro ao processar documentos JSON:', error);
          responsavel.documentos = {};
        }
      }
      
      return responsavel;
    } catch (error) {
      console.error('Erro ao buscar responsável por ID:', error);
      throw new Error('Erro ao buscar responsável');
    }
  }
  
  // Buscar responsáveis por clínica (novo schema)
  static async findByClinicaId(clinicaId: number): Promise<ResponsavelTecnico[]> {
    try {
      const selectQuery = `
        SELECT * FROM responsaveis_tecnicos 
        WHERE clinica_id = ?
        ORDER BY created_at ASC
      `;
      const result = await query(selectQuery, [clinicaId]);
      
      // Processar campos JSON para cada responsável
      return result.map((responsavel: any) => {
        if (responsavel.operadoras_habilitadas && typeof responsavel.operadoras_habilitadas === 'string') {
          try {
            responsavel.operadoras_habilitadas = JSON.parse(responsavel.operadoras_habilitadas);
          } catch (error) {
            console.warn('Erro ao processar operadoras_habilitadas JSON:', error);
            responsavel.operadoras_habilitadas = [];
          }
        }
        
        if (responsavel.documentos && typeof responsavel.documentos === 'string') {
          try {
            responsavel.documentos = JSON.parse(responsavel.documentos);
          } catch (error) {
            console.warn('Erro ao processar documentos JSON:', error);
            responsavel.documentos = {};
          }
        }
        
        return responsavel;
      });
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
          
          // Processar campos JSON
          if (key === 'operadoras_habilitadas' || key === 'documentos') {
            values.push(value ? JSON.stringify(value) : null);
          } else {
            values.push(value);
          }
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }
      
      const updateQuery = `
        UPDATE responsaveis_tecnicos 
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
  
  // Deletar responsável técnico (soft delete) - novo schema
  static async delete(id: number): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE responsaveis_tecnicos 
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
  
  // Verificar se CRM já existe na clínica (novo schema) - MANTIDO PARA COMPATIBILIDADE
  static async checkCrmExists(clinicaId: number, crm: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `
        SELECT id FROM responsaveis_tecnicos 
        WHERE clinica_id = ? AND registro_conselho = ? AND status = 'ativo'
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

  // Verificar se Registro do Conselho já existe na clínica (novo schema)
  static async checkRegistroExists(clinicaId: number, registro: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `
        SELECT id FROM responsaveis_tecnicos 
        WHERE clinica_id = ? AND registro_conselho = ? AND status = 'ativo'
      `;
      let params: any[] = [clinicaId, registro];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar Registro do Conselho:', error);
      throw new Error('Erro ao verificar Registro do Conselho');
    }
  }

  // Contar clínicas
  static async count(where?: any): Promise<number> {
    try {
      let queryStr = 'SELECT COUNT(*) as count FROM clinicas';
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