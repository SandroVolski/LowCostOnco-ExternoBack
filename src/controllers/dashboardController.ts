// src/controllers/dashboardController.ts

import { Request, Response } from 'express';
import { query } from '../config/database';
import { ApiResponse } from '../types';

export class DashboardController {
  
  // GET /api/dashboard/metrics - Métricas principais do sistema
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 Buscando métricas do dashboard...');
      
      // Buscar métricas principais
      const [
        totalClinicas,
        totalOperadoras,
        totalProtocolos,
        totalPacientes,
        totalPrincipiosAtivos,
        solicitacoesHoje,
        solicitacoesSemana,
        solicitacoesMes,
        taxaAprovacao,
        tempoMedioResposta
      ] = await Promise.all([
        DashboardController.getTotalClinicas(),
        DashboardController.getTotalOperadoras(),
        DashboardController.getTotalProtocolos(),
        DashboardController.getTotalPacientes(),
        DashboardController.getTotalPrincipiosAtivos(),
        DashboardController.getSolicitacoesHoje(),
        DashboardController.getSolicitacoesSemana(),
        DashboardController.getSolicitacoesMes(),
        DashboardController.getTaxaAprovacao(),
        DashboardController.getTempoMedioResposta()
      ]);
      
      const metrics = {
        totalClinicas,
        totalOperadoras,
        totalProtocolos,
        totalPacientes,
        totalPrincipiosAtivos,
        solicitacoesHoje,
        solicitacoesSemana,
        solicitacoesMes,
        taxaAprovacao,
        tempoMedioResposta
      };
      
      console.log('✅ Métricas obtidas com sucesso:', metrics);
      
      const response: ApiResponse = {
        success: true,
        message: 'Métricas do dashboard obtidas com sucesso',
        data: metrics
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar métricas do dashboard:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar métricas do dashboard',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/dashboard/charts - Dados para gráficos
  static async getChartsData(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 Buscando dados para gráficos...');
      
      const [chartData, performanceData, statusData, trendData] = await Promise.all([
        DashboardController.getChartData(),
        DashboardController.getPerformanceData(),
        DashboardController.getStatusData(),
        DashboardController.getTrendData()
      ]);
      
      const chartsData = {
        chartData,
        performanceData,
        statusData,
        trendData
      };
      
      console.log('✅ Dados dos gráficos obtidos com sucesso');
      
      const response: ApiResponse = {
        success: true,
        message: 'Dados dos gráficos obtidos com sucesso',
        data: chartsData
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar dados dos gráficos:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar dados dos gráficos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/dashboard/performance - Performance das clínicas
  static async getClinicasPerformance(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 Buscando performance das clínicas...');
      
      const performance = await DashboardController.getClinicasPerformanceData();
      
      console.log('✅ Performance das clínicas obtida com sucesso');
      
      const response: ApiResponse = {
        success: true,
        message: 'Performance das clínicas obtida com sucesso',
        data: performance
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar performance das clínicas:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar performance das clínicas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // Métodos auxiliares para buscar métricas específicas
  private static async getTotalClinicas(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(*) as total FROM Clinicas WHERE status = "ativo"');
      return result[0]?.total || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar total de clínicas:', error);
      return 0;
    }
  }

  private static async getTotalOperadoras(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(*) as total FROM Operadoras WHERE status = "ativo"');
      return result[0]?.total || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar total de operadoras:', error);
      return 0;
    }
  }

  private static async getTotalProtocolos(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(*) as total FROM Protocolos WHERE status = "ativo"');
      return result[0]?.total || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar total de protocolos:', error);
      return 0;
    }
  }

  private static async getTotalPacientes(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(*) as total FROM Pacientes_Clinica WHERE status != "Óbito"');
      return result[0]?.total || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar total de pacientes:', error);
      return 0;
    }
  }

  private static async getTotalPrincipiosAtivos(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(DISTINCT nome) as total FROM Medicamentos_Protocolo');
      return result[0]?.total || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar total de princípios ativos:', error);
      return 0;
    }
  }

  private static async getSolicitacoesHoje(): Promise<number> {
    try {
      const result = await query(`
        SELECT COUNT(*) as total FROM Solicitacoes_Autorizacao 
        WHERE DATE(data_solicitacao) = CURDATE()
      `);
      return result[0]?.total || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar solicitações de hoje:', error);
      return 0;
    }
  }

  private static async getSolicitacoesSemana(): Promise<number> {
    try {
      const result = await query(`
        SELECT COUNT(*) as total FROM Solicitacoes_Autorizacao 
        WHERE YEARWEEK(data_solicitacao) = YEARWEEK(CURDATE())
      `);
      return result[0]?.total || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar solicitações da semana:', error);
      return 0;
    }
  }

  private static async getSolicitacoesMes(): Promise<number> {
    try {
      const result = await query(`
        SELECT COUNT(*) as total FROM Solicitacoes_Autorizacao 
        WHERE MONTH(data_solicitacao) = MONTH(CURDATE()) 
        AND YEAR(data_solicitacao) = YEAR(CURDATE())
      `);
      return result[0]?.total || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar solicitações do mês:', error);
      return 0;
    }
  }

  private static async getTaxaAprovacao(): Promise<number> {
    try {
      const result = await query(`
        SELECT 
          ROUND(
            (COUNT(CASE WHEN status = 'aprovada' THEN 1 END) * 100.0) / 
            COUNT(*), 1
          ) as taxa
        FROM Solicitacoes_Autorizacao 
        WHERE status IN ('aprovada', 'rejeitada', 'em_analise')
      `);
      return result[0]?.taxa || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar taxa de aprovação:', error);
      return 0;
    }
  }

  private static async getTempoMedioResposta(): Promise<number> {
    try {
      const result = await query(`
        SELECT 
          ROUND(AVG(DATEDIFF(data_resposta, data_solicitacao)), 1) as tempo_medio
        FROM Solicitacoes_Autorizacao 
        WHERE status = 'aprovada' 
        AND data_resposta IS NOT NULL
      `);
      return result[0]?.tempo_medio || 0;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar tempo médio de resposta:', error);
      return 0;
    }
  }

  // Dados para gráficos
  private static async getChartData(): Promise<any[]> {
    try {
      const result = await query(`
        SELECT 
          DATE_FORMAT(data_solicitacao, '%Y-%m') as mes,
          COUNT(*) as solicitacoes,
          COUNT(CASE WHEN status = 'aprovada' THEN 1 END) as aprovacoes,
          COUNT(CASE WHEN status IN ('pendente', 'em_analise') THEN 1 END) as pendentes
        FROM Solicitacoes_Autorizacao 
        WHERE data_solicitacao >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(data_solicitacao, '%Y-%m')
        ORDER BY mes ASC
      `);
      
      // Formatar dados para o gráfico
      return result.map((row: any) => ({
        mes: row.mes.substring(5), // Apenas o mês (MM)
        solicitacoes: parseInt(row.solicitacoes),
        aprovacoes: parseInt(row.aprovacoes),
        pendentes: parseInt(row.pendentes)
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados do gráfico:', error);
      return [];
    }
  }

  private static async getPerformanceData(): Promise<any[]> {
    try {
      const result = await query(`
        SELECT 
          'Aprovadas' as name,
          COUNT(CASE WHEN status = 'aprovada' THEN 1 END) * 100.0 / COUNT(*) as value,
          '#79d153' as color
        FROM Solicitacoes_Autorizacao 
        WHERE status IN ('aprovada', 'rejeitada', 'em_analise')
        UNION ALL
        SELECT 
          'Em Análise' as name,
          COUNT(CASE WHEN status = 'em_analise' THEN 1 END) * 100.0 / COUNT(*) as value,
          '#e4a94f' as color
        FROM Solicitacoes_Autorizacao 
        WHERE status IN ('aprovada', 'rejeitada', 'em_analise')
        UNION ALL
        SELECT 
          'Negadas' as name,
          COUNT(CASE WHEN status = 'rejeitada' THEN 1 END) * 100.0 / COUNT(*) as value,
          '#f26b6b' as color
        FROM Solicitacoes_Autorizacao 
        WHERE status IN ('aprovada', 'rejeitada', 'em_analise')
      `);
      
      return result.map((row: any) => ({
        name: row.name,
        value: Math.round(parseFloat(row.value) * 10) / 10,
        color: row.color
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados de performance:', error);
      return [];
    }
  }

  private static async getStatusData(): Promise<any[]> {
    try {
      const result = await query(`
        SELECT 
          status as name,
          COUNT(*) as value
        FROM Solicitacoes_Autorizacao 
        GROUP BY status
        ORDER BY value DESC
      `);
      
      const colors = ['#79d153', '#e4a94f', '#f26b6b', '#6b7bb3'];
      
      return result.map((row: any, index: number) => ({
        name: row.name === 'aprovada' ? 'Aprovadas' : 
              row.name === 'em_analise' ? 'Em Análise' : 
              row.name === 'rejeitada' ? 'Negadas' : row.name,
        value: parseInt(row.value),
        color: colors[index % colors.length]
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados de status:', error);
      return [];
    }
  }

  private static async getTrendData(): Promise<any[]> {
    try {
      // Primeiro, buscar dados reais das solicitações
      const result = await query(`
        SELECT 
          DATE_FORMAT(data_solicitacao, '%Y-%m') as periodo,
          COUNT(DISTINCT clinica_id) as usuarios,
          COUNT(*) as solicitacoes
        FROM Solicitacoes_Autorizacao 
        WHERE data_solicitacao >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(data_solicitacao, '%Y-%m')
        ORDER BY periodo ASC
      `);
      
      // Se não há dados, criar dados de exemplo para os últimos 6 meses
      if (result.length === 0) {
        const meses = [];
        const hoje = new Date();
        
        for (let i = 5; i >= 0; i--) {
          const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
          const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
          
          meses.push({
            periodo: mes,
            usuarios: 0,
            solicitacoes: 0
          });
        }
        
        return meses;
      }
      
      return result.map((row: any) => ({
        periodo: row.periodo.substring(5), // Apenas o mês (MM)
        usuarios: parseInt(row.usuarios),
        solicitacoes: parseInt(row.solicitacoes)
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados de tendência:', error);
      
      // Fallback com dados de exemplo
      const meses = [];
      const hoje = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
        
        meses.push({
          periodo: mes,
          usuarios: 0,
          solicitacoes: 0
        });
      }
      
      return meses;
    }
  }

  private static async getClinicasPerformanceData(): Promise<any[]> {
    try {
      // Primeiro, buscar clínicas com solicitações
      const result = await query(`
        SELECT 
          c.nome,
          COUNT(s.id) as solicitacoes,
          COUNT(CASE WHEN s.status = 'aprovada' THEN 1 END) as aprovacoes,
          ROUND(
            (COUNT(CASE WHEN s.status = 'aprovada' THEN 1 END) * 100.0) / 
            NULLIF(COUNT(*), 0), 1
          ) as taxaAprovacao,
          ROUND(
            AVG(CASE WHEN s.status = 'aprovada' AND s.data_resposta IS NOT NULL 
                THEN DATEDIFF(s.data_resposta, s.data_solicitacao) END), 1
          ) as tempoMedio
        FROM Clinicas c
        LEFT JOIN Solicitacoes_Autorizacao s ON c.id = s.clinica_id
        WHERE c.status = 'ativo'
        GROUP BY c.id, c.nome
        HAVING solicitacoes > 0
        ORDER BY taxaAprovacao DESC
        LIMIT 10
      `);
      
      // Se não há clínicas com solicitações, mostrar todas as clínicas ativas
      if (result.length === 0) {
        const clinicasAtivas = await query(`
          SELECT 
            c.nome,
            0 as solicitacoes,
            0 as aprovacoes,
            0.0 as taxaAprovacao,
            0.0 as tempoMedio
          FROM Clinicas c
          WHERE c.status = 'ativo'
          ORDER BY c.nome ASC
          LIMIT 10
        `);
        
        return clinicasAtivas.map((row: any) => ({
          nome: row.nome,
          solicitacoes: 0,
          aprovacoes: 0,
          taxaAprovacao: 0.0,
          tempoMedio: 0.0
        }));
      }
      
      return result.map((row: any) => ({
        nome: row.nome,
        solicitacoes: parseInt(row.solicitacoes),
        aprovacoes: parseInt(row.aprovacoes),
        taxaAprovacao: parseFloat(row.taxaAprovacao) || 0,
        tempoMedio: parseFloat(row.tempoMedio) || 0
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao buscar performance das clínicas:', error);
      
      // Fallback com dados de exemplo
      return [
        { nome: 'Clínica A', solicitacoes: 0, aprovacoes: 0, taxaAprovacao: 0.0, tempoMedio: 0.0 },
        { nome: 'Clínica B', solicitacoes: 0, aprovacoes: 0, taxaAprovacao: 0.0, tempoMedio: 0.0 },
        { nome: 'Clínica C', solicitacoes: 0, aprovacoes: 0, taxaAprovacao: 0.0, tempoMedio: 0.0 }
      ];
    }
  }
}
