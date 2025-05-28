import { query, queryWithLimit } from '../config/database';
import { Paciente, PacienteCreateInput, PacienteUpdateInput, PaginationParams, PaginatedResponse } from '../types';

// Função auxiliar para converter datas no backend (adicione no início do arquivo)
const convertDateToMySQL = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Se já está no formato MySQL (YYYY-MM-DD), retorna como está
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Se está no formato brasileiro (DD/MM/YYYY)
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    if (day && month && year && year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Se é uma data válida em outro formato, tenta converter
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn('Erro ao converter data:', dateStr, error);
  }
  
  return '';
};

// Função auxiliar para validar dados obrigatórios
const validatePacienteData = (data: PacienteCreateInput): string[] => {
  const errors: string[] = [];
  
  if (!data.Paciente_Nome?.trim()) {
    errors.push('Nome do paciente é obrigatório');
  }
  
  if (!data.Codigo?.trim()) {
    errors.push('Código do paciente é obrigatório');
  }
  
  if (!data.Data_Nascimento) {
    errors.push('Data de nascimento é obrigatória');
  } else {
    const convertedDate = convertDateToMySQL(data.Data_Nascimento);
    if (!convertedDate) {
      errors.push('Data de nascimento inválida');
    }
  }
  
  if (!data.Cid_Diagnostico?.trim()) {
    errors.push('CID do diagnóstico é obrigatório');
  }
  
  if (!data.Sexo?.trim()) {
    errors.push('Sexo é obrigatório');
  }
  
  return errors;
};

export class PacienteModel {
  
  // Buscar todos os pacientes com paginação e filtros
  static async findAll(params: PaginationParams): Promise<PaginatedResponse<Paciente>> {
    const { page = 1, limit = 10, search = '' } = params;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let searchParams: any[] = [];
    
    if (search && search.trim() !== '') {
      whereClause = `WHERE p.Paciente_Nome LIKE ? OR p.Codigo LIKE ? OR p.cpf LIKE ?`;
      const searchTerm = `%${search.trim()}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    }
    
    // Query base para buscar pacientes (sem LIMIT/OFFSET)
    const baseSelectQuery = `
      SELECT 
        p.*,
        o.nome as operadora_nome,
        pr.nome as prestador_nome
      FROM Pacientes_Clinica p
      LEFT JOIN Operadoras o ON p.Operadora = o.id
      LEFT JOIN Prestadores pr ON p.Prestador = pr.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;
    
    // Query para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Pacientes_Clinica p 
      ${whereClause}
    `;
    
    try {
      console.log('Executando queries...');
      console.log('Base query:', baseSelectQuery);
      console.log('Parâmetros de busca:', searchParams);
      console.log('Limit:', limit, 'Offset:', offset);
      
      // Executar contagem
      const countResult = await query(countQuery, searchParams);
      
      // Executar busca com limit usando função especial
      const patients = await queryWithLimit(baseSelectQuery, searchParams, limit, offset);
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
      
      console.log(`✅ Sucesso! ${patients.length} pacientes encontrados de um total de ${total}`);
      
      return {
        data: patients,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages
        }
      };
    } catch (error) {
      console.error('❌ Erro detalhado ao buscar pacientes:', error);
      throw new Error('Erro ao buscar pacientes');
    }
  }
  
  // Buscar paciente por ID
  static async findById(id: number): Promise<Paciente | null> {
    const selectQuery = `
      SELECT 
        p.*,
        o.nome as operadora_nome,
        pr.nome as prestador_nome
      FROM Pacientes_Clinica p
      LEFT JOIN Operadoras o ON p.Operadora = o.id
      LEFT JOIN Prestadores pr ON p.Prestador = pr.id
      WHERE p.id = ?
    `;
    
    try {
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar paciente por ID:', error);
      throw new Error('Erro ao buscar paciente');
    }
  }
  
  // Buscar pacientes por clínica
  static async findByClinicaId(clinicaId: number, params: PaginationParams): Promise<PaginatedResponse<Paciente>> {
    const { page = 1, limit = 10, search = '' } = params;
    const offset = (page - 1) * limit;
    
    let whereClause = `WHERE p.clinica_id = ?`;
    let searchParams: any[] = [clinicaId];
    
    if (search && search.trim() !== '') {
      whereClause += ` AND (p.Paciente_Nome LIKE ? OR p.Codigo LIKE ? OR p.cpf LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      searchParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Query base para buscar pacientes (sem LIMIT/OFFSET)
    const baseSelectQuery = `
      SELECT 
        p.*,
        o.nome as operadora_nome,
        pr.nome as prestador_nome
      FROM Pacientes_Clinica p
      LEFT JOIN Operadoras o ON p.Operadora = o.id
      LEFT JOIN Prestadores pr ON p.Prestador = pr.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Pacientes_Clinica p 
      ${whereClause}
    `;
    
    try {
      console.log('Executando queries da clínica...');
      
      // Executar contagem
      const countResult = await query(countQuery, searchParams);
      
      // Executar busca com limit usando função especial
      const patients = await queryWithLimit(baseSelectQuery, searchParams, limit, offset);
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: patients,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages
        }
      };
    } catch (error) {
      console.error('Erro ao buscar pacientes da clínica:', error);
      throw new Error('Erro ao buscar pacientes da clínica');
    }
  }
  
  // Criar paciente
  static async create(pacienteData: PacienteCreateInput): Promise<Paciente> {
    console.log('🔧 Dados recebidos para criação:', pacienteData);
    
    // Validar dados obrigatórios
    const validationErrors = validatePacienteData(pacienteData);
    if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
    }
    
    // Converter e validar datas
    const dataNascimento = convertDateToMySQL(pacienteData.Data_Nascimento);
    const dataPrimeiraSolicitacao = convertDateToMySQL(
        pacienteData.Data_Primeira_Solicitacao || new Date().toISOString().split('T')[0]
    );
    
    if (!dataNascimento) {
        throw new Error('Data de nascimento inválida');
    }
    
    if (!dataPrimeiraSolicitacao) {
        throw new Error('Data da primeira solicitação inválida');
    }
    
    console.log('🔧 Datas convertidas:', {
        dataNascimento,
        dataPrimeiraSolicitacao
    });
    
    const insertQuery = `
        INSERT INTO Pacientes_Clinica (
        clinica_id, Paciente_Nome, Operadora, Prestador, Codigo, 
        Data_Nascimento, Sexo, Cid_Diagnostico, Data_Primeira_Solicitacao,
        cpf, rg, telefone, endereco, email, nome_responsavel, 
        telefone_responsavel, plano_saude, numero_carteirinha, 
        status, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        pacienteData.clinica_id || 1, // Valor padrão se não fornecido
        pacienteData.Paciente_Nome,
        pacienteData.Operadora || 1, // Valor padrão se não fornecido
        pacienteData.Prestador || 1, // Valor padrão se não fornecido
        pacienteData.Codigo,
        dataNascimento, // Data já convertida
        pacienteData.Sexo,
        pacienteData.Cid_Diagnostico,
        dataPrimeiraSolicitacao, // Data já convertida
        pacienteData.cpf || null,
        pacienteData.rg || null,
        pacienteData.telefone || null,
        pacienteData.endereco || null,
        pacienteData.email || null,
        pacienteData.nome_responsavel || null,
        pacienteData.telefone_responsavel || null,
        pacienteData.plano_saude || null,
        pacienteData.numero_carteirinha || null,
        pacienteData.status || 'ativo',
        pacienteData.observacoes || null
    ];
    
    console.log('🔧 Valores finais para inserção:', values);
    
    try {
        const result = await query(insertQuery, values);
        const insertId = result.insertId;
        
        console.log('✅ Paciente criado com ID:', insertId);
        
        // Buscar o paciente recém-criado
        const newPaciente = await this.findById(insertId);
        if (!newPaciente) {
        throw new Error('Erro ao buscar paciente recém-criado');
        }
        
        return newPaciente;
    } catch (error) {
        console.error('❌ Erro ao criar paciente:', error);
        throw new Error('Erro ao criar paciente');
    }
    }
  
  // Atualizar paciente
  static async update(id: number, pacienteData: PacienteUpdateInput): Promise<Paciente | null> {
    // Construir query dinâmica baseada nos campos fornecidos
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.entries(pacienteData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }
    
    const updateQuery = `
      UPDATE Pacientes_Clinica 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    values.push(id);
    
    try {
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null; // Paciente não encontrado
      }
      
      // Buscar o paciente atualizado
      return await this.findById(id);
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      throw new Error('Erro ao atualizar paciente');
    }
  }
  
  // Deletar paciente
  static async delete(id: number): Promise<boolean> {
    const deleteQuery = `DELETE FROM Pacientes_Clinica WHERE id = ?`;
    
    try {
      const result = await query(deleteQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
      throw new Error('Erro ao deletar paciente');
    }
  }
  
  // Verificar se código já existe
  static async checkCodigoExists(codigo: string, excludeId?: number): Promise<boolean> {
    let checkQuery = `SELECT id FROM Pacientes_Clinica WHERE Codigo = ?`;
    let params: any[] = [codigo];
    
    if (excludeId) {
      checkQuery += ` AND id != ?`;
      params.push(excludeId);
    }
    
    try {
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      throw new Error('Erro ao verificar código');
    }
  }
  
  // Verificar se CPF já existe
  static async checkCpfExists(cpf: string, excludeId?: number): Promise<boolean> {
    let checkQuery = `SELECT id FROM Pacientes_Clinica WHERE cpf = ?`;
    let params: any[] = [cpf];
    
    if (excludeId) {
      checkQuery += ` AND id != ?`;
      params.push(excludeId);
    }
    
    try {
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar CPF:', error);
      throw new Error('Erro ao verificar CPF');
    }
  }
}