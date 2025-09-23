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
    
    // Buscar contagens totais usando queries diretas
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
      query('SELECT COUNT(*) as count FROM Clinicas').then(r => r[0]?.count || 0),
      query('SELECT COUNT(*) as count FROM Operadoras').then(r => r[0]?.count || 0),
      query('SELECT COUNT(*) as count FROM Protocolos').then(r => r[0]?.count || 0),
      query('SELECT COUNT(*) as count FROM Pacientes_Clinica').then(r => r[0]?.count || 0),
      // Contagem real de princípios ativos distintos na base externa
      query(`SELECT COUNT(DISTINCT PrincipioAtivo) AS total FROM ${process.env.EXT_DB_NAME || process.env.SERVICO_DB_NAME || 'bd_servico'}.dPrincipioativo`).then(r => r[0]?.total || 0),
      query('SELECT COUNT(*) as count FROM Solicitacoes_Autorizacao').then(r => r[0]?.count || 0),
      SolicitacaoAutorizacaoModel.countByDate(new Date()),
      SolicitacaoAutorizacaoModel.countByDateRange(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
      ),
      SolicitacaoAutorizacaoModel.countByDateRange(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      ),
      query('SELECT COUNT(*) as count FROM Clinicas WHERE status = ?', ['ativa']).then(r => r[0]?.count || 0),
      query('SELECT COUNT(*) as count FROM Operadoras WHERE status = ?', ['ativa']).then(r => r[0]?.count || 0)
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
    
    const operadoras = await OperadoraModel.findAll();

    const operadorasInfo = await Promise.all(
      operadoras.map(async (operadora) => {
        const totalClinicas = await query('SELECT COUNT(*) as count FROM Clinicas WHERE operadora_id = ?', [operadora.id]).then(r => r[0]?.count || 0);
        const totalSolicitacoes = await SolicitacaoAutorizacaoModel.countByOperadora(operadora.id || 0);
        const totalPacientes = await PacienteModel.countByOperadora(operadora.id || 0);
        const aprovacoes = await SolicitacaoAutorizacaoModel.countByOperadoraAndStatus(operadora.id || 0, 'aprovada');
        const taxaAprovacao = totalSolicitacoes > 0 ? (aprovacoes / totalSolicitacoes) * 100 : 0;
        const tempoMedioResposta = await SolicitacaoAutorizacaoModel.getTempoMedioRespostaByOperadora(operadora.id || 0);

        return {
          id: operadora.id,
          nome: operadora.nome,
          codigo: operadora.codigo,
          totalClinicas,
          totalSolicitacoes,
          totalPacientes,
          taxaAprovacao: Math.round(taxaAprovacao * 100) / 100,
          tempoMedioResposta: Math.round(tempoMedioResposta * 100) / 100,
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

// Buscar informações das clínicas
export const getClinicasInfo = async (req: Request, res: Response) => {
  try {
    console.log('🔧 AdminController.getClinicasInfo() iniciado');
    
    const clinicas = await ClinicaModel.findAll();

    const clinicasInfo = await Promise.all(
      clinicas.map(async (clinica) => {
        const totalSolicitacoes = await SolicitacaoAutorizacaoModel.countByClinica(clinica.id || 0);
        const totalPacientes = await PacienteModel.count({ clinica_id: clinica.id });
        const aprovacoes = await SolicitacaoAutorizacaoModel.countByClinicaAndStatus(clinica.id || 0, 'aprovada');
        const taxaAprovacao = totalSolicitacoes > 0 ? (aprovacoes / totalSolicitacoes) * 100 : 0;
        const tempoMedioResposta = await SolicitacaoAutorizacaoModel.getTempoMedioRespostaByClinica(clinica.id || 0);

        // Buscar nome da operadora
        const operadora = clinica.operadora_id ? await OperadoraModel.findById(clinica.operadora_id) : null;

        return {
          id: clinica.id,
          nome: clinica.nome,
          operadora_id: clinica.operadora_id,
          operadora_nome: operadora?.nome || 'Sem operadora',
          totalSolicitacoes,
          totalPacientes,
          taxaAprovacao: Math.round(taxaAprovacao * 100) / 100,
          tempoMedioResposta: Math.round(tempoMedioResposta * 100) / 100,
          status: clinica.status || 'ativa'
        };
      })
    );

    console.log('✅ Informações das clínicas obtidas:', clinicasInfo.length);

    res.json({
      success: true,
      data: clinicasInfo
    });
  } catch (error) {
    console.error('❌ Erro no AdminController.getClinicasInfo():', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Buscar dados dos gráficos administrativos
export const getChartsData = async (req: Request, res: Response) => {
  try {
    console.log('🔧 AdminController.getChartsData() iniciado');
    
    // Dados de solicitações por mês (últimos 12 meses)
    const chartData = await SolicitacaoAutorizacaoModel.getSolicitacoesPorMes(12);
    
    // Dados de status das solicitações
    const statusData = await SolicitacaoAutorizacaoModel.getStatusDistribution();
    
    // Dados de performance por operadora
    const performanceData = await OperadoraModel.getPerformanceData();
    
    // Dados de tendência (últimos 6 meses)
    const trendData = await SolicitacaoAutorizacaoModel.getTrendData(6);

    const chartsData = {
      chartData,
      statusData,
      performanceData,
      trendData
    };

    console.log('✅ Dados dos gráficos administrativos obtidos');

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
