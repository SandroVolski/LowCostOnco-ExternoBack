// src/controllers/analysisController.ts

import { Request, Response } from 'express';
import { query } from '../config/database';
import { ApiResponse } from '../types';

interface AuthRequest extends Request {
  user?: { id: number; clinicaId?: number; role?: string };
}

export class AnalysisController {
  
  // GET /api/analysis/organs - Buscar dados de análise por órgão
  static async getOrganAnalysis(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('🔧 Buscando dados de análise por órgão...');
      
      // Query para buscar solicitações agrupadas por CID e órgão
      const analysisQuery = `
        SELECT 
          s.diagnostico_cid,
          s.diagnostico_descricao,
          s.cliente_nome,
          s.status,
          s.data_solicitacao,
          s.medicamentos_antineoplasticos,
          s.finalidade,
          s.ciclo_atual,
          s.ciclos_previstos,
          s.id as solicitacao_id,
          s.created_at
        FROM Solicitacoes_Autorizacao s
        WHERE s.diagnostico_cid IS NOT NULL 
          AND s.diagnostico_cid != ''
        ORDER BY s.created_at DESC
        LIMIT 1000
      `;
      
      const solicitacoes = await query(analysisQuery, []);
      
      console.log(`📊 ${solicitacoes.length} solicitações encontradas para análise`);
      
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
      
      solicitacoes.forEach((solicitacao: any) => {
        const cid = solicitacao.diagnostico_cid;
        const organId = CID_TO_ORGAN_MAP[cid];
        
        if (!organId) return;
        
        if (!organData[organId]) {
          organData[organId] = {
            organId,
            organName: ORGAN_INFO[organId as keyof typeof ORGAN_INFO]?.name || organId,
            color: ORGAN_INFO[organId as keyof typeof ORGAN_INFO]?.color || 'medical-gray',
            description: ORGAN_INFO[organId as keyof typeof ORGAN_INFO]?.description || 'Sistema corporal',
            patients: 0,
            cids: new Set(),
            protocols: new Set(),
            solicitacoes: []
          };
        }
        
        organData[organId].patients++;
        organData[organId].cids.add(cid);
        
        // Criar protocolo baseado na finalidade e medicamentos
        const finalidade = solicitacao.finalidade || 'Não especificado';
        const medicamentos = solicitacao.medicamentos_antineoplasticos || '';
        const protocolo = `${finalidade} - ${medicamentos.split(',')[0] || 'Protocolo'}`;
        organData[organId].protocols.add(protocolo);
        
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
      
      // Converter Sets para Arrays e formatar dados
      const analysisData = Object.values(organData).map((organ: any) => ({
        ...organ,
        cids: Array.from(organ.cids),
        protocols: Array.from(organ.protocols).slice(0, 5) // Limitar a 5 protocolos
      }));
      
      console.log('✅ Dados de análise processados:', analysisData.length, 'órgãos');
      
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
      console.log('🔧 Buscando métricas de análise...');
      
      // Buscar métricas em paralelo
      const [solicitacoesResult, protocolosResult, cidsResult] = await Promise.all([
        query('SELECT COUNT(*) as total FROM Solicitacoes_Autorizacao', []),
        query('SELECT COUNT(*) as total FROM Protocolos', []),
        query('SELECT COUNT(DISTINCT diagnostico_cid) as total FROM Solicitacoes_Autorizacao WHERE diagnostico_cid IS NOT NULL AND diagnostico_cid != ""', [])
      ]);
      
      const totalSolicitacoes = solicitacoesResult[0]?.total || 0;
      const totalProtocolos = protocolosResult[0]?.total || 0;
      const totalCids = cidsResult[0]?.total || 0;
      
      // Buscar pacientes únicos
      const pacientesResult = await query('SELECT COUNT(DISTINCT cliente_nome) as total FROM Solicitacoes_Autorizacao', []);
      const totalPacientes = pacientesResult[0]?.total || 0;
      
      // Buscar sistemas monitorados (órgãos únicos)
      const sistemasResult = await query(`
        SELECT COUNT(DISTINCT 
          CASE 
            WHEN diagnostico_cid IN ('C71.0', 'C71.1', 'C71.9', 'C70.0', 'C70.1', 'C70.9', 'C72.0', 'C72.1', 'C72.2', 'C72.3', 'C72.4', 'C72.5', 'C72.8', 'C72.9') THEN 'brain'
            WHEN diagnostico_cid IN ('C78.0', 'C34.0', 'C34.1', 'C34.2', 'C34.3', 'C34.8', 'C34.9', 'C78.1', 'C78.2', 'C78.3', 'C78.4', 'C78.5', 'C78.6', 'C78.7', 'C78.8', 'C78.9') THEN 'lungs'
            WHEN diagnostico_cid IN ('C38.0', 'C38.1', 'C38.2', 'C38.3', 'C38.4', 'C38.8', 'C76.1') THEN 'heart'
            WHEN diagnostico_cid IN ('C22.0', 'C22.1', 'C22.2', 'C22.3', 'C22.4', 'C22.7', 'C22.8', 'C22.9') THEN 'liver'
            WHEN diagnostico_cid IN ('C16.0', 'C16.1', 'C16.2', 'C16.3', 'C16.4', 'C16.5', 'C16.6', 'C16.8', 'C16.9') THEN 'stomach'
            WHEN diagnostico_cid IN ('C64', 'C65', 'C66') THEN 'kidneys'
            WHEN diagnostico_cid IN ('C67.0', 'C67.1', 'C67.2', 'C67.3', 'C67.4', 'C67.5', 'C67.6', 'C67.7', 'C67.8', 'C67.9') THEN 'bladder'
            WHEN diagnostico_cid IN ('C61', 'C77.5') THEN 'prostate'
            WHEN diagnostico_cid IN ('C50.0', 'C50.1', 'C50.2', 'C50.3', 'C50.4', 'C50.5', 'C50.6', 'C50.8', 'C50.9', 'C77.2') THEN 'breast'
            ELSE NULL
          END
        ) as total
        FROM Solicitacoes_Autorizacao 
        WHERE diagnostico_cid IS NOT NULL AND diagnostico_cid != ""
      `, []);
      
      const sistemasMonitorados = sistemasResult[0]?.total || 0;
      
      const metrics = {
        totalSolicitacoes,
        totalPacientes,
        sistemasMonitorados,
        protocolosAtivos: totalProtocolos,
        cidsCadastrados: totalCids,
      };
      
      console.log('✅ Métricas calculadas:', metrics);
      
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
}
