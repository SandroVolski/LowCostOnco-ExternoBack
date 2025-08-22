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

// Log somente em desenvolvimento
const isDevelopmentEnv = (process.env.NODE_ENV || 'development') !== 'production';
const logDev = (...args: any[]) => { if (isDevelopmentEnv) console.log(...args); };

const ALLOWED_SEX: Array<'Masculino' | 'Feminino'> = ['Masculino', 'Feminino'];
const ALLOWED_STATUS: Array<'Em tratamento' | 'Em remissão' | 'Alta' | 'Óbito'> = ['Em tratamento', 'Em remissão', 'Alta', 'Óbito'];

const normalizeSexo = (sexo: string | undefined): 'Masculino' | 'Feminino' | '' => {
  if (!sexo) return '';
  const s = (sexo || '').toString().trim().toLowerCase();
  if (s.startsWith('m')) return 'Masculino';
  if (s.startsWith('f')) return 'Feminino';
  return '';
};

const normalizeStatus = (status: string | undefined): 'Em tratamento' | 'Em remissão' | 'Alta' | 'Óbito' | '' => {
  if (!status) return '';
  const s = (status || '').toString().trim().toLowerCase();
  if (s.includes('remiss')) return 'Em remissão';
  if (s.includes('alta')) return 'Alta';
  if (s.includes('óbito') || s.includes('obito')) return 'Óbito';
  if (s.includes('trat')) return 'Em tratamento';
  return '';
};

const normalizeCep = (cep: string | undefined): string | undefined => {
  if (!cep) return undefined;
  const digits = cep.replace(/\D/g, '');
  if (digits.length >= 8) {
    const d8 = digits.slice(0, 8);
    return `${d8.substring(0, 5)}-${d8.substring(5)}`;
  }
  return cep;
};

const resolveIdByName = async (table: 'Operadoras' | 'Prestadores', nameOrId: number | string | undefined, defaultId: number = 1): Promise<number> => {
  if (nameOrId === undefined || nameOrId === null) return defaultId;
  if (typeof nameOrId === 'number') return nameOrId;
  const name = nameOrId.toString().trim();
  if (name === '') return defaultId;
  // Tenta buscar por nome
  const rows = await query(`SELECT id FROM ${table} WHERE nome = ? LIMIT 1`, [name]);
  if (rows && rows.length > 0) {
    return rows[0].id;
  }
  // Cria se não existe
  const insert = await query(`INSERT INTO ${table} (nome) VALUES (?)`, [name]);
  return insert.insertId || defaultId;
};

// Função auxiliar para validar dados obrigatórios
const validatePacienteData = (data: PacienteCreateInput): string[] => {
  const errors: string[] = [];
  
  if (!data.Paciente_Nome?.trim()) {
    errors.push('Nome do paciente é obrigatório');
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
  
  const sexo = normalizeSexo(data.Sexo);
  if (!sexo) {
    errors.push('Sexo deve ser Masculino ou Feminino');
  }

  if (!data.stage?.trim()) {
    errors.push('Stage é obrigatório');
  }

  if (!data.treatment?.trim()) {
    errors.push('Treatment é obrigatório');
  }

  const normalizedStatus = normalizeStatus(data.status);
  if (!normalizedStatus) {
    errors.push('Status inválido. Use Em tratamento/Em remissão/Alta/Óbito');
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
      logDev('Executando queries...');
      logDev('Parâmetros de busca:', searchParams, 'Limit:', limit, 'Offset:', offset);
      
      // Executar contagem e busca em paralelo
      const [countResult, patients] = await Promise.all([
        query(countQuery, searchParams),
        queryWithLimit(baseSelectQuery, searchParams, limit, offset)
      ]);
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
      
      logDev(`✅ Sucesso! ${patients.length} pacientes de ${total}`);
      
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
      logDev('Executando queries da clínica...');
      
      // Executar contagem e busca com limit em paralelo
      const [countResult, patients] = await Promise.all([
        query(countQuery, searchParams),
        queryWithLimit(baseSelectQuery, searchParams, limit, offset)
      ]);
      
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
    logDev('🔧 Dados recebidos para criação:', pacienteData);
    
    // Validar dados obrigatórios
    const validationErrors = validatePacienteData(pacienteData);
    if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
    }
    
    // Resolver Operadora e Prestador
    const operadoraId = await resolveIdByName('Operadoras', pacienteData.Operadora, 1);
    const prestadorId = await resolveIdByName('Prestadores', pacienteData.Prestador, 1);
    
    // Converter e validar datas
    const dataNascimento = convertDateToMySQL(pacienteData.Data_Nascimento);
    const inicioTratamento = pacienteData.Data_Inicio_Tratamento || pacienteData.Data_Primeira_Solicitacao;
    const dataPrimeiraSolicitacao = convertDateToMySQL(
        inicioTratamento || new Date().toISOString().split('T')[0]
    );
    
    if (!dataNascimento) {
        throw new Error('Data de nascimento inválida');
    }
    
    if (!dataPrimeiraSolicitacao) {
        throw new Error('Data da primeira solicitação inválida');
    }
    
    const sexo = normalizeSexo(pacienteData.Sexo);
    const normalizedStatusRaw = normalizeStatus(pacienteData.status);
    const normalizedStatus = normalizedStatusRaw || 'Em tratamento';

    // Normalizações opcionais
    const cep = normalizeCep(pacienteData.endereco_cep);

    const codigoValue = typeof pacienteData.Codigo === 'string' && pacienteData.Codigo.trim() === ''
      ? null
      : (pacienteData.Codigo !== undefined ? pacienteData.Codigo : null);
    
    logDev('🔧 Datas convertidas:', {
        dataNascimento,
        dataPrimeiraSolicitacao
    });
    
    const insertColumns = [
      'clinica_id', 'Paciente_Nome', 'Operadora', 'Prestador', 'Codigo',
      'Data_Nascimento', 'Sexo', 'Cid_Diagnostico', 'Data_Primeira_Solicitacao',
      'cpf', 'rg', 'telefone', 'endereco', 'email', 'nome_responsavel',
      'telefone_responsavel', 'plano_saude', 'abrangencia', 'numero_carteirinha',
      'status', 'observacoes', 'stage', 'treatment', 'peso', 'altura', 'setor_prestador',
      'contato_emergencia_nome', 'contato_emergencia_telefone',
      'endereco_rua', 'endereco_numero', 'endereco_complemento', 'endereco_bairro',
      'endereco_cidade', 'endereco_estado', 'endereco_cep'
    ];
    const placeholders = insertColumns.map(() => '?').join(', ');
    const insertQuery = `
      INSERT INTO Pacientes_Clinica (${insertColumns.join(', ')})
      VALUES (${placeholders})
    `;
    
    const values = [
        pacienteData.clinica_id || 1, // Valor padrão se não fornecido
        pacienteData.Paciente_Nome,
        operadoraId,
        prestadorId,
        codigoValue,
        dataNascimento, // Data já convertida
        sexo,
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
        pacienteData.abrangencia || null,
        pacienteData.numero_carteirinha || null,
        normalizedStatus,
        pacienteData.observacoes || null,
        pacienteData.stage,
        pacienteData.treatment,
        pacienteData.peso ?? null,
        pacienteData.altura ?? null,
        pacienteData.setor_prestador || null,
        pacienteData.contato_emergencia_nome || null,
        pacienteData.contato_emergencia_telefone || null,
        pacienteData.endereco_rua || null,
        pacienteData.endereco_numero || null,
        pacienteData.endereco_complemento || null,
        pacienteData.endereco_bairro || null,
        pacienteData.endereco_cidade || null,
        pacienteData.endereco_estado || null,
        cep || null
    ];
    
    logDev('🔧 Valores finais para inserção:', values);
    
    try {
        const result = await query(insertQuery, values);
        const insertId = result.insertId;
        
        logDev('✅ Paciente criado com ID:', insertId);
        
      // Criar notificação de novo paciente (não bloquear fluxo em caso de erro)
      try {
        await query(
          `INSERT INTO notificacoes (clinica_id, tipo, titulo, mensagem, paciente_id)
           VALUES (?, 'patient_created', 'Novo paciente cadastrado', ?, ?)`,
          [
            pacienteData.clinica_id || 1,
            `Paciente ${pacienteData.Paciente_Nome} foi cadastrado`,
            insertId
          ]
        );
      } catch (e) {
        console.warn('⚠️ Falha ao criar notificação patient_created:', (e as any)?.message || e);
      }

        const newPaciente = await this.findById(insertId);
        if (!newPaciente) {
        throw new Error('Erro ao buscar paciente recém-criado');
        }
        
        return newPaciente;
    } catch (error) {
        console.error('❌ Erro ao criar paciente:', error);
      const message = (error as any)?.message || 'Erro ao criar paciente';
      throw new Error(message);
    }
    }
  
  // Atualizar paciente
  static async update(id: number, pacienteData: PacienteUpdateInput): Promise<Paciente | null> {
    // Pré-processar dados (normalizações, resoluções e conversões)
    const dataToUpdate: any = { ...pacienteData };

    if (dataToUpdate.Data_Inicio_Tratamento && !dataToUpdate.Data_Primeira_Solicitacao) {
      const conv = convertDateToMySQL(dataToUpdate.Data_Inicio_Tratamento);
      if (conv) dataToUpdate.Data_Primeira_Solicitacao = conv;
      delete dataToUpdate.Data_Inicio_Tratamento;
    }

    if (dataToUpdate.Data_Nascimento) {
      const conv = convertDateToMySQL(dataToUpdate.Data_Nascimento);
      if (conv) dataToUpdate.Data_Nascimento = conv;
    }

    if (dataToUpdate.endereco_cep) {
      dataToUpdate.endereco_cep = normalizeCep(dataToUpdate.endereco_cep);
    }

    if (dataToUpdate.Sexo) {
      const sx = normalizeSexo(dataToUpdate.Sexo);
      if (sx) dataToUpdate.Sexo = sx;
    }

    if (dataToUpdate.status) {
      const st = normalizeStatus(dataToUpdate.status);
      if (st) dataToUpdate.status = st;
    }

    if (dataToUpdate.Operadora !== undefined) {
      dataToUpdate.Operadora = await resolveIdByName('Operadoras', dataToUpdate.Operadora, 1);
    }

    if (dataToUpdate.Prestador !== undefined) {
      dataToUpdate.Prestador = await resolveIdByName('Prestadores', dataToUpdate.Prestador, 1);
    }

    // Construir query dinâmica baseada nos campos fornecidos
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.entries(dataToUpdate).forEach(([key, value]) => {
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