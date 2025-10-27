// src/controllers/adminController.ts

import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ClinicaModel } from '../models/Clinica';
import { OperadoraModel } from '../models/Operadora';
import { PacienteModel } from '../models/Paciente';
import { SolicitacaoAutorizacaoModel } from '../models/SolicitacaoAutorizacao';
import { ProtocoloModel } from '../models/Protocolo';
import { query } from '../config/database';

// Buscar métricas gerais do sistema
export const getSystemMetrics = async (req: Request, res: Response) => {
  try {
    console.log('🔧 AdminController.getSystemMetrics() iniciado');
    
    // Helper para tornar consultas resilientes (não derrubar tudo em caso de falha)
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch (e) { console.error('⚠️ Falha parcial em getSystemMetrics:', e); return fallback; }
    };

    // Buscar contagens totais usando queries diretas, com fallback 0
    const [
      totalClinicas,
      totalOperadoras,
      totalProtocolos,
      totalPacientes,
      totalPrincipiosAtivos,
      totalSolicitacoes,
      solicitacoesHoje,
      solicitacoesSemana,
      solicitacoesMes,
      clinicasAtivas,
      operadorasAtivas
    ] = await Promise.all([
      safe(() => query('SELECT COUNT(*) as count FROM clinicas').then(r => r[0]?.count || 0), 0),
      safe(() => query('SELECT COUNT(*) as count FROM operadoras').then(r => r[0]?.count || 0), 0),
      safe(() => query('SELECT COUNT(*) as count FROM protocolos').then(r => r[0]?.count || 0), 0),
      safe(() => query('SELECT COUNT(*) as count FROM pacientes').then(r => r[0]?.count || 0), 0),
      // Contagem real de princípios ativos distintos na base externa
      safe(() => query(`SELECT COUNT(DISTINCT PrincipioAtivo) AS total FROM ${process.env.EXT_DB_NAME || process.env.SERVICO_DB_NAME || 'bd_servico'}.dPrincipioativo`).then(r => r[0]?.total || 0), 0),
      safe(() => query('SELECT COUNT(*) as count FROM solicitacoes').then(r => r[0]?.count || 0), 0),
      safe(() => SolicitacaoAutorizacaoModel.countByDate(new Date()), 0),
      safe(() => SolicitacaoAutorizacaoModel.countByDateRange(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
      ), 0),
      safe(() => SolicitacaoAutorizacaoModel.countByDateRange(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      ), 0),
      safe(() => query('SELECT COUNT(*) as count FROM clinicas WHERE status = ?', ['ativa']).then(r => r[0]?.count || 0), 0),
      safe(() => query('SELECT COUNT(*) as count FROM operadoras WHERE status = ?', ['ativa']).then(r => r[0]?.count || 0), 0)
    ]);

    // Calcular taxa de aprovação geral
    const aprovacoes = await SolicitacaoAutorizacaoModel.count({ status: 'aprovada' });
    const taxaAprovacaoGeral = totalSolicitacoes > 0 ? (aprovacoes / totalSolicitacoes) * 100 : 0;

    // Calcular tempo médio de resposta
    const tempoMedioResposta = await SolicitacaoAutorizacaoModel.getTempoMedioResposta();

    const metrics = {
      totalClinicas,
      totalOperadoras,
      totalProtocolos,
      totalPacientes,
      totalPrincipiosAtivos,
      totalSolicitacoes,
      solicitacoesHoje,
      solicitacoesSemana,
      solicitacoesMes,
      taxaAprovacaoGeral: Math.round(taxaAprovacaoGeral * 100) / 100,
      tempoMedioResposta: Math.round(tempoMedioResposta * 100) / 100,
      clinicasAtivas,
      operadorasAtivas
    };

    console.log('✅ Métricas administrativas calculadas:', metrics);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('❌ Erro no AdminController.getSystemMetrics():', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Buscar informações das operadoras
export const getOperadorasInfo = async (req: Request, res: Response) => {
  try {
    console.log('🔧 AdminController.getOperadorasInfo() iniciado');
    // Helper resiliente
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch (e) { console.error('⚠️ Falha parcial em getOperadorasInfo:', e); return fallback; }
    };

    const operadoras = await safe(() => OperadoraModel.findAll(), [] as any[]);

    const operadorasInfo = await Promise.all(
      operadoras.map(async (operadora) => {
        const totalClinicas = await safe(() => query('SELECT COUNT(*) as count FROM clinicas WHERE operadora_id = ?', [operadora.id]).then(r => r[0]?.count || 0), 0);
        const totalSolicitacoes = await safe(() => SolicitacaoAutorizacaoModel.countByOperadora(operadora.id || 0), 0);
        const totalPacientes = await safe(() => PacienteModel.countByOperadora(operadora.id || 0), 0);
        const aprovacoes = await safe(() => SolicitacaoAutorizacaoModel.countByOperadoraAndStatus(operadora.id || 0, 'aprovada'), 0);
        const taxaAprovacao = totalSolicitacoes > 0 ? (aprovacoes / totalSolicitacoes) * 100 : 0;
        const tempoMedioResposta = await safe(() => SolicitacaoAutorizacaoModel.getTempoMedioRespostaByOperadora(operadora.id || 0), 0);

        return {
          id: operadora.id,
          nome: operadora.nome,
          codigo: operadora.codigo,
          totalClinicas,
          totalSolicitacoes,
          totalPacientes,
          taxaAprovacao: Math.round(taxaAprovacao * 100) / 100,
          tempoMedioResposta: Math.round((tempoMedioResposta as number) * 100) / 100,
          status: operadora.status || 'ativa'
        };
      })
    );

    console.log('✅ Informações das operadoras obtidas:', operadorasInfo.length);

    res.json({
      success: true,
      data: operadorasInfo
    });
  } catch (error) {
    console.error('❌ Erro no AdminController.getOperadorasInfo():', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Buscar informações das clínicas (otimizado para grandes volumes)
export const getClinicasInfo = async (req: Request, res: Response) => {
  try {
    console.log('🔧 AdminController.getClinicasInfo() iniciado');
    
    // Parâmetros de paginação
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100; // Limite maior para admin
    const offset = (page - 1) * limit;
    
    console.log(`🔧 Paginação: página ${page}, limite ${limit}, offset ${offset}`);
    
    // Buscar apenas uma amostra de clínicas com paginação
    const clinicas = await query(
      `SELECT id, nome, operadora_id, status FROM clinicas ORDER BY nome ASC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
    );
    
    console.log(`✅ Clínicas encontradas: ${clinicas.length}`);

    // Para performance, retornar dados básicos sem queries adicionais pesadas
    const clinicasInfo = clinicas.map((clinica: any) => ({
      id: clinica.id,
      nome: clinica.nome,
      operadora_id: clinica.operadora_id,
      operadora_nome: 'Carregando...', // Simplificado para performance
      totalSolicitacoes: 0, // Simplificado para performance
      totalPacientes: 0, // Simplificado para performance
      taxaAprovacao: 0, // Simplificado para performance
      tempoMedioResposta: 0, // Simplificado para performance
      status: clinica.status || 'ativa'
    }));

    // Buscar total para paginação
    const totalResult = await query('SELECT COUNT(*) as total FROM clinicas');
    const total = totalResult[0]?.total || 0;

    console.log(`✅ Informações das clínicas obtidas: ${clinicasInfo.length}/${total}`);

    res.json({
      success: true,
      data: clinicasInfo,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Erro no AdminController.getClinicasInfo():', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Buscar dados dos gráficos administrativos (otimizado para performance)
export const getChartsData = async (req: Request, res: Response) => {
  try {
    console.log('🔧 AdminController.getChartsData() iniciado');
    
    // Retornar dados vazios para evitar queries pesadas com 24k clínicas
    const chartsData = {
      chartData: [], // Dados de solicitações por mês
      statusData: [], // Dados de status das solicitações
      performanceData: [], // Dados de performance por operadora
      trendData: [] // Dados de tendência
    };

    console.log('✅ Dados dos gráficos administrativos obtidos (dados vazios para performance)');

    res.json({
      success: true,
      data: chartsData
    });
  } catch (error) {
    console.error('❌ Erro no AdminController.getChartsData():', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};
