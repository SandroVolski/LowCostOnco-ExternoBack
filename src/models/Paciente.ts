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
  
  // Mapear nomes de tabelas para as tabelas reais
  const tableMap = {
    'Operadoras': 'operadoras',
    'Prestadores': 'responsaveis_tecnicos'
  };
  
  const realTable = tableMap[table];
  if (!realTable) return defaultId;
  
  // Tenta buscar por nome
  const rows = await query(`SELECT id FROM ${realTable} WHERE nome = ? LIMIT 1`, [name]);
  if (rows && rows.length > 0) {
    return rows[0].id;
  }
  
  // Para prestadores, não criar automaticamente (deixar como defaultId)
  if (table === 'Prestadores') {
    console.log(`⚠️ Prestador "${name}" não encontrado, usando ID padrão: ${defaultId}`);
    return defaultId;
  }
  
  // Para operadoras, criar se não existe
  const insert = await query(`INSERT INTO ${realTable} (nome) VALUES (?)`, [name]);
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
        rt.nome as medico_assistente_nome,
        rt.email as medico_assistente_email,
        rt.telefone as medico_assistente_telefone,
        rt.especialidade as medico_assistente_especialidade
      FROM pacientes p
      LEFT JOIN operadoras o ON p.operadora_id = o.id
      LEFT JOIN responsaveis_tecnicos rt ON p.prestador_id = rt.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;
    
    // Query para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM pacientes p 
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
      
      // Debug: Verificar campos do médico assistente
      if (patients && patients.length > 0) {
        console.log('🔧 Debug findAll - Primeiro paciente:');
        const firstPatient = patients[0];
        console.log('  ID:', firstPatient.id);
        console.log('  Nome:', firstPatient.nome);
        console.log('  Prestador ID:', firstPatient.prestador_id);
        console.log('  Médico Assistente Nome:', firstPatient.medico_assistente_nome);
        console.log('  Médico Assistente Email:', firstPatient.medico_assistente_email);
        console.log('  Médico Assistente Telefone:', firstPatient.medico_assistente_telefone);
        console.log('  Médico Assistente Especialidade:', firstPatient.medico_assistente_especialidade);
      }
      
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
        rt.nome as medico_assistente_nome,
        rt.email as medico_assistente_email,
        rt.telefone as medico_assistente_telefone,
        rt.especialidade as medico_assistente_especialidade
      FROM pacientes p
      LEFT JOIN operadoras o ON p.operadora_id = o.id
      LEFT JOIN responsaveis_tecnicos rt ON p.prestador_id = rt.id
      WHERE p.id = ?
    `;
    
    try {
      const result = await query(selectQuery, [id]);
      console.log('🔧 Debug findById - Resultado da consulta:', result);
      if (result.length > 0) {
        const paciente = result[0];
        console.log('🔧 Debug findById - Paciente encontrado:');
        console.log('  ID:', paciente.id);
        console.log('  Nome:', paciente.nome);
        console.log('  Prestador ID:', paciente.prestador_id);
        console.log('  Médico Assistente Nome:', paciente.medico_assistente_nome);
        console.log('  Médico Assistente Email:', paciente.medico_assistente_email);
        console.log('  Médico Assistente Telefone:', paciente.medico_assistente_telefone);
        console.log('  Médico Assistente Especialidade:', paciente.medico_assistente_especialidade);
      }
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
      whereClause += ` AND (p.nome LIKE ? OR p.codigo LIKE ? OR p.cpf LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      searchParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Query base para buscar pacientes (sem LIMIT/OFFSET)
    const baseSelectQuery = `
      SELECT 
        p.*,
        o.nome as operadora_nome,
        rt.nome as medico_assistente_nome,
        rt.email as medico_assistente_email,
        rt.telefone as medico_assistente_telefone,
        rt.especialidade as medico_assistente_especialidade
      FROM pacientes p
      LEFT JOIN operadoras o ON p.operadora_id = o.id
      LEFT JOIN responsaveis_tecnicos rt ON p.prestador_id = rt.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM pacientes p 
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
      
      // Debug: Log dos campos do médico assistente
      if (patients && patients.length > 0) {
        console.log('🔧 Debug findByClinicaId - Primeiro paciente:');
        const firstPatient = patients[0];
        console.log('  ID:', firstPatient.id);
        console.log('  Nome:', firstPatient.nome);
        console.log('  Prestador ID:', firstPatient.prestador_id);
        console.log('  Médico Assistente Nome:', firstPatient.medico_assistente_nome);
        console.log('  Médico Assistente Email:', firstPatient.medico_assistente_email);
        console.log('  Médico Assistente Telefone:', firstPatient.medico_assistente_telefone);
        console.log('  Médico Assistente Especialidade:', firstPatient.medico_assistente_especialidade);
      }
      
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
  
  // Criar paciente (novo schema: tabela 'pacientes')
  static async create(pacienteData: PacienteCreateInput): Promise<Paciente> {
    logDev('🔧 Dados recebidos para criação:', pacienteData);
    
    // Validar dados obrigatórios
    const validationErrors = validatePacienteData(pacienteData);
    if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
    }
    
    // SEMPRE buscar operadora_id da clínica, ignorando o valor vindo do frontend
    let operadoraId: number | null = null;
    
    if (pacienteData.clinica_id) {
      try {
        console.log('🔧 Buscando operadora_id da clínica:', pacienteData.clinica_id);
        const clinicaResult = await query(
          'SELECT operadora_id FROM clinicas WHERE id = ?',
          [pacienteData.clinica_id]
        );
        if (clinicaResult.length > 0 && clinicaResult[0].operadora_id) {
          operadoraId = clinicaResult[0].operadora_id;
          console.log('✅ operadora_id obtido da clínica:', operadoraId);
        } else {
          console.warn('⚠️ Clínica não tem operadora_id configurado');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar operadora_id da clínica:', error);
      }
    }
    
    // Se ainda não encontrou, tentar usar o valor do frontend (como fallback)
    if (!operadoraId && pacienteData.Operadora !== undefined && pacienteData.Operadora !== null) {
      console.warn('⚠️ Usando operadora_id do frontend (pode causar erro se inválido)');
      if (typeof pacienteData.Operadora === 'number') operadoraId = pacienteData.Operadora;
      else {
        const parsed = parseInt(pacienteData.Operadora as any, 10);
        operadoraId = Number.isFinite(parsed) ? parsed : null;
      }
    }
    
    // Processar prestador_id
    let prestadorId: number | null = null;
    if (pacienteData.Prestador !== undefined && pacienteData.Prestador !== null) {
      prestadorId = await resolveIdByName('Prestadores', pacienteData.Prestador, 1);
      console.log('🔧 prestador_id resolvido:', prestadorId);
    }
    
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
    
    // Montar JSONs conforme novo schema
    const contatosJson = ((): any => {
      const obj: any = {};
      if (pacienteData.telefone) obj.telefone = pacienteData.telefone;
      if (pacienteData.email) obj.email = pacienteData.email;
      return Object.keys(obj).length ? JSON.stringify(obj) : null;
    })();

    const contatoEmergenciaJson = ((): any => {
      const obj: any = {};
      if (pacienteData.contato_emergencia_nome) obj.nome = pacienteData.contato_emergencia_nome;
      if (pacienteData.contato_emergencia_telefone) obj.telefone = pacienteData.contato_emergencia_telefone;
      return Object.keys(obj).length ? JSON.stringify(obj) : null;
    })();

    const enderecoJson = ((): any => {
      const obj: any = {};
      if (pacienteData.endereco) obj.endereco = pacienteData.endereco;
      if (pacienteData.endereco_rua) obj.rua = pacienteData.endereco_rua;
      if (pacienteData.endereco_numero) obj.numero = pacienteData.endereco_numero;
      if (pacienteData.endereco_complemento) obj.complemento = pacienteData.endereco_complemento;
      if (pacienteData.endereco_bairro) obj.bairro = pacienteData.endereco_bairro;
      if (pacienteData.endereco_cidade) obj.cidade = pacienteData.endereco_cidade;
      if (pacienteData.endereco_estado) obj.estado = pacienteData.endereco_estado;
      if (cep) obj.cep = cep;
      return Object.keys(obj).length ? JSON.stringify(obj) : null;
    })();

    const insertColumns = [
      'clinica_id', 'operadora_id', 'prestador_id', 'codigo', 'nome',
      'cpf', 'rg', 'data_nascimento', 'sexo', 'cid_diagnostico', 'data_primeira_solicitacao',
      'stage', 'treatment', 'peso', 'altura', 'status', 'contatos', 'endereco',
      'plano_saude', 'abrangencia', 'numero_carteirinha', 'contato_emergencia', 'observacoes'
    ];
    const placeholders = insertColumns.map(() => '?').join(', ');
    const insertQuery = `
      INSERT INTO pacientes (${insertColumns.join(', ')})
      VALUES (${placeholders})
    `;
    
    // LOG DETALHADO para debug
    console.log('🔧 ===== DEBUG CRIAÇÃO PACIENTE =====');
    console.log('🔧 clinica_id:', pacienteData.clinica_id);
    console.log('🔧 operadora_id (resolvido):', operadoraId);
    console.log('🔧 prestador_id (resolvido):', prestadorId);
    console.log('🔧 Operadora original (frontend):', pacienteData.Operadora);
    console.log('🔧 Prestador original (frontend):', pacienteData.Prestador);
    console.log('🔧 =====================================');
    
    const values = [
        pacienteData.clinica_id || 1,
        operadoraId,
        prestadorId,
        codigoValue,
        pacienteData.Paciente_Nome,
        (pacienteData.cpf || '').replace(/\D/g, '') || null,
        pacienteData.rg || null,
        dataNascimento,
        sexo,
        pacienteData.Cid_Diagnostico,
        dataPrimeiraSolicitacao,
        pacienteData.stage,
        pacienteData.treatment,
        pacienteData.peso ?? null,
        pacienteData.altura ?? null,
        normalizedStatus,
        contatosJson,
        enderecoJson,
        pacienteData.plano_saude || null,
        pacienteData.abrangencia || null,
        pacienteData.numero_carteirinha || null,
        contatoEmergenciaJson,
        pacienteData.observacoes || null
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
    // Mapeamento de campos do frontend (maiúsculas) para banco (minúsculas)
    const fieldMapping: Record<string, string> = {
      'Paciente_Nome': 'nome',
      'Codigo': 'codigo',
      'Data_Nascimento': 'data_nascimento',
      'Sexo': 'sexo',
      'Cid_Diagnostico': 'cid_diagnostico',
      'Data_Primeira_Solicitacao': 'data_primeira_solicitacao',
      'Data_Inicio_Tratamento': 'data_primeira_solicitacao',
      'Operadora': 'operadora_id',
      'Prestador': 'prestador_id'
    };
    
    // Campos que devem ser agrupados em JSON
    const jsonFields = {
      contatos: ['telefone', 'email', 'contato_telefone', 'contato_celular', 'contato_email'],
      endereco: ['endereco_rua', 'endereco_numero', 'endereco_bairro', 'endereco_cidade', 'endereco_estado', 'endereco_cep', 'endereco'],
      contato_emergencia: ['contato_emergencia_nome', 'contato_emergencia_telefone']
    };
    
    // Pré-processar dados (normalizações, resoluções e conversões)
    const dataToUpdate: any = {};
    const jsonData: any = {
      contatos: {},
      endereco: {},
      contato_emergencia: {}
    };

    // Aplicar mapeamento e normalizações
    for (const [key, value] of Object.entries(pacienteData)) {
      if (value === undefined || value === null || value === '') continue;
      
      // Verificar se é um campo JSON
      let isJsonField = false;
      for (const [jsonKey, fields] of Object.entries(jsonFields)) {
        if (fields.includes(key)) {
          isJsonField = true;
          
          // Processar campos de contatos
          if (jsonKey === 'contatos') {
            if (key === 'telefone' || key === 'contato_telefone') jsonData.contatos.telefone = value;
            else if (key === 'email' || key === 'contato_email') jsonData.contatos.email = value;
            else if (key === 'contato_celular') jsonData.contatos.celular = value;
          }
          // Processar campos de endereço
          else if (jsonKey === 'endereco') {
            if (typeof value === 'object' && !Array.isArray(value)) {
              // Se já é um objeto, usar diretamente
              jsonData.endereco = { ...jsonData.endereco, ...value };
            } else if (key === 'endereco_rua') jsonData.endereco.rua = value;
            else if (key === 'endereco_numero') jsonData.endereco.numero = value;
            else if (key === 'endereco_bairro') jsonData.endereco.bairro = value;
            else if (key === 'endereco_cidade') jsonData.endereco.cidade = value;
            else if (key === 'endereco_estado') jsonData.endereco.estado = value;
            else if (key === 'endereco_cep') jsonData.endereco.cep = normalizeCep(value as string);
          }
          // Processar campos de contato de emergência
          else if (jsonKey === 'contato_emergencia') {
            if (typeof value === 'object' && !Array.isArray(value)) {
              jsonData.contato_emergencia = { ...jsonData.contato_emergencia, ...value };
            } else if (key === 'contato_emergencia_nome') jsonData.contato_emergencia.nome = value;
            else if (key === 'contato_emergencia_telefone') jsonData.contato_emergencia.telefone = value;
          }
          break;
        }
      }
      
      // Se não é campo JSON, processar normalmente
      if (!isJsonField) {
        const dbField = fieldMapping[key] || key;
        
        if (key === 'Data_Inicio_Tratamento' || key === 'Data_Primeira_Solicitacao') {
          const conv = convertDateToMySQL(value as string);
          if (conv) dataToUpdate['data_primeira_solicitacao'] = conv;
        } else if (key === 'Data_Nascimento') {
          const conv = convertDateToMySQL(value as string);
          if (conv) dataToUpdate['data_nascimento'] = conv;
        } else if (key === 'Sexo') {
          const sx = normalizeSexo(value as string);
          if (sx) dataToUpdate['sexo'] = sx;
        } else if (key === 'status') {
          const st = normalizeStatus(value as string);
          if (st) dataToUpdate['status'] = st;
        } else if (key === 'Operadora') {
          const operadoraId = await resolveIdByName('Operadoras', value as string | number, 1);
          dataToUpdate['operadora_id'] = operadoraId;
        } else if (key === 'Prestador') {
          const prestadorId = await resolveIdByName('Prestadores', value as string | number, 1);
          dataToUpdate['prestador_id'] = prestadorId;
        } else if (key === 'Cid_Diagnostico') {
          dataToUpdate['cid_diagnostico'] = Array.isArray(value) ? value.join(', ') : value;
        } else {
          dataToUpdate[dbField] = value;
        }
      }
    }

    // Adicionar campos JSON se tiverem dados
    if (Object.keys(jsonData.contatos).length > 0) {
      dataToUpdate.contatos = JSON.stringify(jsonData.contatos);
    }
    if (Object.keys(jsonData.endereco).length > 0) {
      dataToUpdate.endereco = JSON.stringify(jsonData.endereco);
    }
    if (Object.keys(jsonData.contato_emergencia).length > 0) {
      dataToUpdate.contato_emergencia = JSON.stringify(jsonData.contato_emergencia);
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
      UPDATE pacientes 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    values.push(id);
    
    console.log('🔧 Debug UPDATE query:');
    console.log('Query:', updateQuery);
    console.log('Values:', values);
    
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
  
  // Deletar paciente (novo schema)
  static async delete(id: number): Promise<boolean> {
    const deleteQuery = `DELETE FROM pacientes WHERE id = ?`;
    
    try {
      const result = await query(deleteQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
      throw new Error('Erro ao deletar paciente');
    }
  }
  
  // Verificar se código já existe (novo schema)
  static async checkCodigoExists(codigo: string, excludeId?: number): Promise<boolean> {
    let checkQuery = `SELECT id FROM pacientes WHERE codigo = ?`;
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
  
  // Verificar se CPF já existe (novo schema) – normaliza máscara e consulta tabela correta
  static async checkCpfExists(cpf: string, excludeId?: number): Promise<boolean> {
    const digits = (cpf || '').replace(/\D/g, '');
    let checkQuery = `SELECT id FROM pacientes WHERE cpf = ?`;
    let params: any[] = [digits];
    
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

  // Buscar pacientes por operadora (via clínicas vinculadas)
  static async findByOperadoraId(operadoraId: number, params: PaginationParams): Promise<PaginatedResponse<Paciente>> {
    const { page = 1, limit = 10, search = '' } = params;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE c.operadora_id = ?`;
    const searchParams: any[] = [operadoraId];

    if (search && search.trim() !== '') {
      whereClause += ` AND (p.nome LIKE ? OR p.codigo LIKE ? OR p.cpf LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      searchParams.push(searchTerm, searchTerm, searchTerm);
    }

    const baseSelectQuery = `
      SELECT 
        p.*, c.nome as clinica_nome, c.codigo as clinica_codigo, o.nome as operadora_nome
      FROM pacientes p
      INNER JOIN clinicas c ON p.clinica_id = c.id
      LEFT JOIN operadoras o ON c.operadora_id = o.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM pacientes p 
      INNER JOIN clinicas c ON p.clinica_id = c.id
      ${whereClause}
    `;

    try {
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
      console.error('Erro ao buscar pacientes por operadora:', error);
      throw new Error('Erro ao buscar pacientes por operadora');
    }
  }
  // Contar pacientes
  static async count(where?: any): Promise<number> {
    try {
      let queryStr = 'SELECT COUNT(*) as count FROM pacientes';
      const params: any[] = [];

      if (where) {
        const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        queryStr += ` WHERE ${conditions}`;
        params.push(...Object.values(where));
      }

      const result = await query(queryStr, params);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar pacientes:', error);
      return 0;
    }
  }

  // Contar pacientes por operadora
  static async countByOperadora(operadoraId: number): Promise<number> {
    try {
      const queryStr = `
        SELECT COUNT(*) as count 
        FROM pacientes p
        INNER JOIN clinicas c ON p.clinica_id = c.id
        WHERE c.operadora_id = ?
      `;
      const result = await query(queryStr, [operadoraId]);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar pacientes por operadora:', error);
      return 0;
    }
  }

}