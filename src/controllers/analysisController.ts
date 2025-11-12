// src/controllers/analysisController.ts

import { Request, Response } from 'express';
import { query } from '../config/database';
import { ApiResponse } from '../types';

interface AuthRequest extends Request {
  user?: { id: number; clinicaId?: number; operadoraId?: number; tipo?: string; role?: string };
}

export class AnalysisController {
  
  // GET /api/analysis/organs - Buscar dados de análise por órgão
  static async getOrganAnalysis(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user: any = req.user;

      // Extrair filtros da query
      const { clinicId, sex, ageMin, ageMax } = req.query;

      // Construir query com filtros
      let whereConditions = ['s.diagnostico_cid IS NOT NULL', "s.diagnostico_cid != ''"];
      const queryParams: any[] = [];
      let fromClause = 'FROM solicitacoes s';

      // Se for operadora, fazer JOIN e filtrar por operadora_id
      if (user?.tipo === 'operadora' && user?.operadoraId) {
        fromClause = 'FROM solicitacoes s INNER JOIN clinicas c ON s.clinica_id = c.id';
        whereConditions.push('c.operadora_id = ?');
        queryParams.push(user.operadoraId);
      }

      if (clinicId) {
        whereConditions.push('s.clinica_id = ?');
        queryParams.push(clinicId);
      }

      if (sex) {
        whereConditions.push('s.sexo = ?');
        queryParams.push(sex);
      }

      if (ageMin) {
        whereConditions.push('s.idade >= ?');
        queryParams.push(ageMin);
      }

      if (ageMax) {
        whereConditions.push('s.idade <= ?');
        queryParams.push(ageMax);
      }

      const analysisQuery = `
        SELECT 
          s.diagnostico_cid,
          s.diagnostico_descricao,
          JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.nome')) AS cliente_nome,
          s.status,
          s.data_solicitacao,
          JSON_UNQUOTE(JSON_EXTRACT(s.medicamentos, '$.antineoplasticos')) AS medicamentos_antineoplasticos,
          s.finalidade,
          s.ciclo_atual,
          s.ciclos_previstos,
          s.id as solicitacao_id,
          s.created_at
        ${fromClause}
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY s.created_at DESC
        LIMIT 1000
      `;

      const solicitacoes = await query(analysisQuery, queryParams);

      // Mapeamento de CIDs para órgãos
      const CID_TO_ORGAN_MAP: Record<string, string> = {
        // Sistema Nervoso Central
        'C71.0': 'brain', 'C71.1': 'brain', 'C71.9': 'brain',
        'C70.0': 'brain', 'C70.1': 'brain', 'C70.9': 'brain',
        'C72.0': 'brain', 'C72.1': 'brain', 'C72.2': 'brain',
        'C72.3': 'brain', 'C72.4': 'brain', 'C72.5': 'brain',
        'C72.8': 'brain', 'C72.9': 'brain',
        
        // Sistema Respiratório
        'C78.0': 'lungs', 'C34.0': 'lungs', 'C34.1': 'lungs',
        'C34.2': 'lungs', 'C34.3': 'lungs', 'C34.8': 'lungs',
        'C34.9': 'lungs', 'C78.1': 'lungs', 'C78.2': 'lungs',
        'C78.3': 'lungs', 'C78.4': 'lungs', 'C78.5': 'lungs',
        'C78.6': 'lungs', 'C78.7': 'lungs', 'C78.8': 'lungs',
        'C78.9': 'lungs',
        
        // Sistema Cardiovascular
        'C38.0': 'heart', 'C38.1': 'heart', 'C38.2': 'heart',
        'C38.3': 'heart', 'C38.4': 'heart', 'C38.8': 'heart',
        'C76.1': 'heart',
        
        // Sistema Digestivo - Fígado
        'C22.0': 'liver', 'C22.1': 'liver', 'C22.2': 'liver',
        'C22.3': 'liver', 'C22.4': 'liver', 'C22.7': 'liver',
        'C22.8': 'liver', 'C22.9': 'liver',
        
        // Sistema Digestivo - Estômago
        'C16.0': 'stomach', 'C16.1': 'stomach', 'C16.2': 'stomach',
        'C16.3': 'stomach', 'C16.4': 'stomach', 'C16.5': 'stomach',
        'C16.6': 'stomach', 'C16.8': 'stomach', 'C16.9': 'stomach',
        
        // Sistema Urinário - Rins
        'C64': 'kidneys', 'C65': 'kidneys', 'C66': 'kidneys',
        
        // Sistema Urinário - Bexiga
        'C67.0': 'bladder', 'C67.1': 'bladder', 'C67.2': 'bladder',
        'C67.3': 'bladder', 'C67.4': 'bladder', 'C67.5': 'bladder',
        'C67.6': 'bladder', 'C67.7': 'bladder', 'C67.8': 'bladder',
        'C67.9': 'bladder',
        
        // Sistema Reprodutor - Próstata
        'C61': 'prostate', 'C77.5': 'prostate',
        
        // Sistema Reprodutor - Mama
        'C50.0': 'breast', 'C50.1': 'breast', 'C50.2': 'breast',
        'C50.3': 'breast', 'C50.4': 'breast', 'C50.5': 'breast',
        'C50.6': 'breast', 'C50.8': 'breast', 'C50.9': 'breast',
        'C77.2': 'breast',
      };

      // Mapeamento de órgãos para informações
      const ORGAN_INFO = {
        brain: { name: 'Cérebro', color: 'medical-purple', description: 'Tumores primários do sistema nervoso central' },
        lungs: { name: 'Pulmões', color: 'medical-blue', description: 'Carcinomas pulmonares e metástases' },
        heart: { name: 'Coração', color: 'medical-red', description: 'Tumores cardíacos raros' },
        liver: { name: 'Fígado', color: 'medical-orange', description: 'Hepatocarcinoma e metástases hepáticas' },
        stomach: { name: 'Estômago', color: 'medical-teal', description: 'Adenocarcinomas gástricos' },
        kidneys: { name: 'Rins', color: 'medical-red', description: 'Carcinomas renais' },
        bladder: { name: 'Bexiga', color: 'medical-blue', description: 'Carcinomas uroteliais' },
        prostate: { name: 'Próstata', color: 'medical-purple', description: 'Adenocarcinomas prostáticos' },
        breast: { name: 'Mama', color: 'medical-pink', description: 'Carcinomas mamários' },
      };

      // Agrupar solicitações por órgão
      const organData: Record<string, any> = {};
      let processedCount = 0;

      solicitacoes.forEach((solicitacao: any) => {
        const cid = solicitacao.diagnostico_cid;
        const organId = CID_TO_ORGAN_MAP[cid];
        
        if (!organId) {
          return;
        }
        
        processedCount++;
        
        if (!organData[organId]) {
          organData[organId] = {
            organId,
            organName: ORGAN_INFO[organId as keyof typeof ORGAN_INFO]?.name || organId,
            color: ORGAN_INFO[organId as keyof typeof ORGAN_INFO]?.color || 'medical-gray',
            description: ORGAN_INFO[organId as keyof typeof ORGAN_INFO]?.description || 'Sistema corporal',
            patients: 0,
            cids: new Map(), // Mudança: Map para contar ocorrências
            protocols: new Map(), // Mudança: Map para contar ocorrências
            solicitacoes: []
          };
        }
        
        organData[organId].patients++;
        
        // Contar CIDs
        if (organData[organId].cids.has(cid)) {
          organData[organId].cids.set(cid, organData[organId].cids.get(cid) + 1);
        } else {
          organData[organId].cids.set(cid, 1);
        }
        
        // Criar protocolo baseado na finalidade e medicamentos
        const finalidade = solicitacao.finalidade || 'Não especificado';
        const medicamentos = solicitacao.medicamentos_antineoplasticos || '';
        const protocolo = `${finalidade} - ${medicamentos.split(',')[0] || 'Protocolo'}`;
        
        // Contar protocolos
        if (organData[organId].protocols.has(protocolo)) {
          organData[organId].protocols.set(protocolo, organData[organId].protocols.get(protocolo) + 1);
        } else {
          organData[organId].protocols.set(protocolo, 1);
        }
        
        // Adicionar solicitação (limitado a 10 por órgão)
        if (organData[organId].solicitacoes.length < 10) {
          organData[organId].solicitacoes.push({
            id: solicitacao.solicitacao_id,
            cliente_nome: solicitacao.cliente_nome,
            diagnostico_cid: solicitacao.diagnostico_cid,
            diagnostico_descricao: solicitacao.diagnostico_descricao,
            finalidade: solicitacao.finalidade,
            status: solicitacao.status,
            data_solicitacao: solicitacao.data_solicitacao,
            medicamentos_antineoplasticos: solicitacao.medicamentos_antineoplasticos,
            ciclo_atual: solicitacao.ciclo_atual,
            ciclos_previstos: solicitacao.ciclos_previstos,
          });
        }
      });

      // Converter Maps para Arrays com contadores e formatar dados
      const analysisData = Object.values(organData).map((organ: any) => {
        // Converter CIDs
        const cidsArray = [];
        for (const [cid, count] of organ.cids.entries()) {
          cidsArray.push({ cid, count });
        }
        
        // Converter Protocolos e ordenar
        const protocolsArray = [];
        for (const [protocol, count] of organ.protocols.entries()) {
          protocolsArray.push({ protocol, count });
        }
        protocolsArray.sort((a, b) => b.count - a.count);
        
        return {
          ...organ,
          cids: cidsArray,
          protocols: protocolsArray.slice(0, 5) // Limitar a 5 protocolos
        };
      });

      const response: ApiResponse = {
        success: true,
        message: 'Dados de análise por órgão encontrados com sucesso',
        data: analysisData
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar dados de análise por órgão:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar dados de análise por órgão',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/analysis/metrics - Buscar métricas gerais de análise
  static async getAnalysisMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user: any = req.user;

      // Extrair filtros da query
      const { clinicId, sex, ageMin, ageMax } = req.query;

      // Construir condições WHERE para filtros
      let whereConditions = [];
      const queryParams: any[] = [];
      let fromClause = 'FROM solicitacoes s';
      let tablePrefix = '';

      // Se for operadora, fazer JOIN e filtrar por operadora_id
      if (user?.tipo === 'operadora' && user?.operadoraId) {
        fromClause = 'FROM solicitacoes s INNER JOIN clinicas c ON s.clinica_id = c.id';
        tablePrefix = 's.';
        whereConditions.push('c.operadora_id = ?');
        queryParams.push(user.operadoraId);
      } else {
        tablePrefix = '';
      }

      if (clinicId) {
        whereConditions.push(`${tablePrefix || 's.'}clinica_id = ?`);
        queryParams.push(clinicId);
      }

      if (sex) {
        whereConditions.push(`${tablePrefix || 's.'}sexo = ?`);
        queryParams.push(sex);
      }

      if (ageMin) {
        whereConditions.push(`${tablePrefix || 's.'}idade >= ?`);
        queryParams.push(ageMin);
      }

      if (ageMax) {
        whereConditions.push(`${tablePrefix || 's.'}idade <= ?`);
        queryParams.push(ageMax);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const whereClauseWithCid = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')} AND ${tablePrefix || 's.'}diagnostico_cid IS NOT NULL AND ${tablePrefix || 's.'}diagnostico_cid != ""`
        : `WHERE ${tablePrefix || 's.'}diagnostico_cid IS NOT NULL AND ${tablePrefix || 's.'}diagnostico_cid != ""`;

      // Buscar métricas em paralelo
      const [solicitacoesResult, protocolosResult, cidsResult] = await Promise.all([
        query(`SELECT COUNT(*) as total ${fromClause} ${whereClause}`, queryParams),
        query('SELECT COUNT(*) as total FROM protocolos', []),
        query(`SELECT COUNT(DISTINCT ${tablePrefix || 's.'}diagnostico_cid) as total ${fromClause} ${whereClauseWithCid}`, queryParams)
      ]);

      const totalSolicitacoes = solicitacoesResult[0]?.total || 0;
      const totalProtocolos = protocolosResult[0]?.total || 0;
      const totalCids = cidsResult[0]?.total || 0;

      // Buscar pacientes únicos
      const pacientesResult = await query(`SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(${tablePrefix || 's.'}cliente_dados,'$.nome'))) as total ${fromClause} ${whereClause}`, queryParams);
      const totalPacientes = pacientesResult[0]?.total || 0;

      // Buscar sistemas monitorados (órgãos únicos)
      const sistemasResult = await query(`
        SELECT COUNT(DISTINCT 
          CASE 
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C71.0', 'C71.1', 'C71.9', 'C70.0', 'C70.1', 'C70.9', 'C72.0', 'C72.1', 'C72.2', 'C72.3', 'C72.4', 'C72.5', 'C72.8', 'C72.9') THEN 'brain'
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C78.0', 'C34.0', 'C34.1', 'C34.2', 'C34.3', 'C34.8', 'C34.9', 'C78.1', 'C78.2', 'C78.3', 'C78.4', 'C78.5', 'C78.6', 'C78.7', 'C78.8', 'C78.9') THEN 'lungs'
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C38.0', 'C38.1', 'C38.2', 'C38.3', 'C38.4', 'C38.8', 'C76.1') THEN 'heart'
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C22.0', 'C22.1', 'C22.2', 'C22.3', 'C22.4', 'C22.7', 'C22.8', 'C22.9') THEN 'liver'
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C16.0', 'C16.1', 'C16.2', 'C16.3', 'C16.4', 'C16.5', 'C16.6', 'C16.8', 'C16.9') THEN 'stomach'
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C64', 'C65', 'C66') THEN 'kidneys'
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C67.0', 'C67.1', 'C67.2', 'C67.3', 'C67.4', 'C67.5', 'C67.6', 'C67.7', 'C67.8', 'C67.9') THEN 'bladder'
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C61', 'C77.5') THEN 'prostate'
            WHEN ${tablePrefix || 's.'}diagnostico_cid IN ('C50.0', 'C50.1', 'C50.2', 'C50.3', 'C50.4', 'C50.5', 'C50.6', 'C50.8', 'C50.9', 'C77.2') THEN 'breast'
            ELSE NULL
          END
        ) as total
        ${fromClause} 
        ${whereClauseWithCid}
      `, queryParams);

      const sistemasMonitorados = sistemasResult[0]?.total || 0;

      const metrics = {
        totalSolicitacoes,
        totalPacientes,
        sistemasMonitorados,
        protocolosAtivos: totalProtocolos,
        cidsCadastrados: totalCids,
      };

      const response: ApiResponse = {
        success: true,
        message: 'Métricas de análise encontradas com sucesso',
        data: metrics
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar métricas de análise:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar métricas de análise',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/analysis/kpis - Buscar KPIs operacionais
  static async getOperationalKPIs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user: any = req.user;

      // Extrair filtros da query
      const { clinicId, sex, ageMin, ageMax } = req.query;

      // Construir condições WHERE para filtros
      let whereConditions = ['s.data_solicitacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)'];
      const queryParams: any[] = [];
      let fromClause = 'FROM solicitacoes s';

      // Se for operadora, fazer JOIN e filtrar por operadora_id
      if (user?.tipo === 'operadora' && user?.operadoraId) {
        fromClause = 'FROM solicitacoes s INNER JOIN clinicas c ON s.clinica_id = c.id';
        whereConditions.push('c.operadora_id = ?');
        queryParams.push(user.operadoraId);
      }

      if (clinicId) {
        whereConditions.push('s.clinica_id = ?');
        queryParams.push(clinicId);
      }

      if (sex) {
        whereConditions.push("JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.sexo')) = ?");
        queryParams.push(sex);
      }

      if (ageMin) {
        whereConditions.push("TIMESTAMPDIFF(YEAR, DATE(JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.data_nascimento'))), CURDATE()) >= ?");
        queryParams.push(ageMin);
      }

      if (ageMax) {
        whereConditions.push("TIMESTAMPDIFF(YEAR, DATE(JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.data_nascimento'))), CURDATE()) <= ?");
        queryParams.push(ageMax);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Taxa de aprovação (últimos 30 dias)
      const aprovacaoResult = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN s.status = 'aprovada' THEN 1 ELSE 0 END) as aprovados
        ${fromClause}
        ${whereClause}
      `, queryParams);

      const total = aprovacaoResult[0]?.total || 0;
      const aprovados = aprovacaoResult[0]?.aprovados || 0;
      const taxaAprovacao = total > 0 ? Math.round((aprovados / total) * 100) : 0;

      // Tempo médio de aprovação (em horas)
      const tempoWhereConditions = [...whereConditions, "s.status = 'aprovada'", 's.updated_at IS NOT NULL'];
      const tempoResult = await query(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, s.data_solicitacao, s.updated_at)) as tempo_medio
        ${fromClause}
        WHERE ${tempoWhereConditions.join(' AND ')}
      `, queryParams);

      const tempoMedio = Math.round(tempoResult[0]?.tempo_medio || 24);

      // Custo médio por paciente (baseado em dados reais se existirem, senão 0)
      const custoResult = await query(`
        SELECT 
          COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados,'$.nome'))) as pacientes_unicos,
          COUNT(*) as total_solicitacoes
        ${fromClause}
        ${whereClause}
      `, queryParams);

      const pacientesUnicos = custoResult[0]?.pacientes_unicos || 1;
      const totalSolicitacoes = custoResult[0]?.total_solicitacoes || 1;
      // Remover cálculo de custo simulado - usar 0 até termos dados reais
      const custoMedio = 0;

      const kpis = {
        taxaAprovacao,
        tempoMedioAprovacao: tempoMedio,
        custoMedioPorPaciente: custoMedio,
        totalSolicitacoes30Dias: total,
        pacientesUnicos30Dias: pacientesUnicos
      };

      const response: ApiResponse = {
        success: true,
        message: 'KPIs operacionais encontrados com sucesso',
        data: kpis
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar KPIs operacionais:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar KPIs operacionais',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/analysis/charts - Buscar dados para gráficos
  static async getChartData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user: any = req.user;

      // Extrair filtros da query
      const { clinicId, sex, ageMin, ageMax } = req.query;

      // Construir condições WHERE para filtros
      let whereConditions = [
        "JSON_EXTRACT(s.medicamentos, '$.antineoplasticos') IS NOT NULL",
        "JSON_UNQUOTE(JSON_EXTRACT(s.medicamentos, '$.antineoplasticos')) != ''",
        's.data_solicitacao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)'
      ];
      const queryParams: any[] = [];
      let fromClause = 'FROM solicitacoes s';

      // Se for operadora, fazer JOIN e filtrar por operadora_id
      if (user?.tipo === 'operadora' && user?.operadoraId) {
        fromClause = 'FROM solicitacoes s INNER JOIN clinicas c ON s.clinica_id = c.id';
        whereConditions.push('c.operadora_id = ?');
        queryParams.push(user.operadoraId);
      }

      if (clinicId) {
        whereConditions.push('s.clinica_id = ?');
        queryParams.push(clinicId);
      }

      if (sex) {
        whereConditions.push("JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.sexo')) = ?");
        queryParams.push(sex);
      }

      if (ageMin) {
        whereConditions.push("TIMESTAMPDIFF(YEAR, DATE(JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.data_nascimento'))), CURDATE()) >= ?");
        queryParams.push(ageMin);
      }

      if (ageMax) {
        whereConditions.push("TIMESTAMPDIFF(YEAR, DATE(JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.data_nascimento'))), CURDATE()) <= ?");
        queryParams.push(ageMax);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Dados de medicamentos mais utilizados (agrupados e limpos)
      const medicamentosResult = await query(`
        SELECT 
          JSON_UNQUOTE(JSON_EXTRACT(s.medicamentos,'$.antineoplasticos')) as medicamentos_antineoplasticos,
          COUNT(*) as total
        ${fromClause}
        ${whereClause}
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(s.medicamentos,'$.antineoplasticos'))
        ORDER BY total DESC
        LIMIT 8
      `, queryParams);

      // Processar e limpar dados de medicamentos
      const medicamentosMap = new Map();

      medicamentosResult.forEach((row: any) => {
        const medicamento = row.medicamentos_antineoplasticos.trim();
        if (medicamento && medicamento !== '') {
          // Extrair apenas o nome principal do medicamento (antes da primeira vírgula)
          const nomePrincipal = medicamento.split(',')[0].trim();
          
          if (medicamentosMap.has(nomePrincipal)) {
            medicamentosMap.set(nomePrincipal, medicamentosMap.get(nomePrincipal) + row.total);
          } else {
            medicamentosMap.set(nomePrincipal, row.total);
          }
        }
      });

      // Converter para array e ordenar por quantidade
      const medicamentos = Array.from(medicamentosMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Limitar a 6 medicamentos para melhor visualização

      // Dados de tipos de câncer por órgão
      const cancerWhereConditions = [
        's.diagnostico_cid IS NOT NULL',
        "s.diagnostico_cid != ''",
        's.data_solicitacao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)'
      ];

      // Adicionar filtro de operadora se necessário
      if (user?.tipo === 'operadora' && user?.operadoraId) {
        cancerWhereConditions.push('c.operadora_id = ?');
      }

      if (clinicId) {
        cancerWhereConditions.push('s.clinica_id = ?');
      }
      if (sex) {
        cancerWhereConditions.push('s.sexo = ?');
      }
      if (ageMin) {
        cancerWhereConditions.push('s.idade >= ?');
      }
      if (ageMax) {
        cancerWhereConditions.push('s.idade <= ?');
      }

      const cancerWhereClause = `WHERE ${cancerWhereConditions.join(' AND ')}`;

      const cancerTypesResult = await query(`
        SELECT 
          CASE 
            WHEN s.diagnostico_cid IN ('C50.0', 'C50.1', 'C50.2', 'C50.3', 'C50.4', 'C50.5', 'C50.6', 'C50.8', 'C50.9', 'C77.2') THEN 'Mama'
            WHEN s.diagnostico_cid IN ('C78.0', 'C34.0', 'C34.1', 'C34.2', 'C34.3', 'C34.8', 'C34.9', 'C78.1', 'C78.2', 'C78.3', 'C78.4', 'C78.5', 'C78.6', 'C78.7', 'C78.8', 'C78.9') THEN 'Pulmão'
            WHEN s.diagnostico_cid IN ('C18', 'C19', 'C20', 'C21') THEN 'Colorretal'
            WHEN s.diagnostico_cid IN ('C61', 'C77.5') THEN 'Próstata'
            WHEN s.diagnostico_cid IN ('C81', 'C82', 'C83', 'C84', 'C85', 'C86', 'C87', 'C88', 'C90', 'C91', 'C92', 'C93', 'C94', 'C95', 'C96') THEN 'Linfomas'
            ELSE 'Outros'
          END as tipo_cancer,
          COUNT(*) as casos
        ${fromClause}
        ${cancerWhereClause}
        GROUP BY tipo_cancer
        ORDER BY casos DESC
      `, queryParams);

      // Dados mensais (últimos 6 meses)
      const monthlyWhereConditions = ['s.data_solicitacao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)'];

      // Adicionar filtro de operadora se necessário
      if (user?.tipo === 'operadora' && user?.operadoraId) {
        monthlyWhereConditions.push('c.operadora_id = ?');
      }

      if (clinicId) {
        monthlyWhereConditions.push('s.clinica_id = ?');
      }
      if (sex) {
        monthlyWhereConditions.push("JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.sexo')) = ?");
      }
      if (ageMin) {
        monthlyWhereConditions.push("TIMESTAMPDIFF(YEAR, DATE(JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.data_nascimento'))), CURDATE()) >= ?");
      }
      if (ageMax) {
        monthlyWhereConditions.push("TIMESTAMPDIFF(YEAR, DATE(JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados, '$.data_nascimento'))), CURDATE()) <= ?");
      }

      const monthlyWhereClause = `WHERE ${monthlyWhereConditions.join(' AND ')}`;

      const monthlyResult = await query(`
        SELECT 
          DATE_FORMAT(s.data_solicitacao, '%Y-%m') as mes,
          COUNT(*) as solicitacoes,
          COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(s.cliente_dados,'$.nome'))) as pacientes_unicos
        ${fromClause}
        ${monthlyWhereClause}
        GROUP BY DATE_FORMAT(s.data_solicitacao, '%Y-%m')
        ORDER BY mes ASC
      `, queryParams);

      const monthlyData = monthlyResult.map((row: any) => ({
        name: new Date(row.mes + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
        solicitacoes: row.solicitacoes,
        patients: row.pacientes_unicos
      }));

      const chartData = {
        medicamentos,
        cancerTypes: cancerTypesResult,
        monthlyData
      };

      const response: ApiResponse = {
        success: true,
        message: 'Dados para gráficos encontrados com sucesso',
        data: chartData
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar dados de gráficos:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar dados de gráficos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
}
