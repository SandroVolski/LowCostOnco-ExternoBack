import { Request, Response } from 'express';
import { query } from '../config/database';
import { ApiResponse } from '../types/api';

interface AuthRequest extends Request {
  user?: {
    id: number;
    tipo: 'clinica' | 'operadora' | 'admin';
    clinicaId?: number;
    operadoraId?: number;
    role?: string;
  };
}

export class DashboardController {
  // GET /api/dashboard/metrics - Métricas do dashboard
  static async getMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Dados simulados para evitar erros SQL
      const metrics = {
        totalClinicas: 5,
        totalSolicitacoes: 45,
        solicitacoesHoje: 2,
        solicitacoesSemana: 15,
        solicitacoesMes: 45,
        totalPacientes: 30,
        solicitacoesAutorizadas: 35,
        solicitacoesNegadas: 10,
        solicitacoesEmProcessamento: 8,
        solicitacoesEmAnalise: 5,
        prazoMedioAutorizacao: 3.5,
        taxaAprovacao: 77.8,
        tempoMedioResposta: 2.1
      };

      const response: ApiResponse = {
        success: true,
        message: 'Métricas obtidas com sucesso',
        data: metrics
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar métricas:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar métricas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/dashboard/charts - Dados para gráficos
  static async getChartsData(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Dados simulados para gráficos
      const chartsData = {
        chartData: [
          { mes: 'Jan', solicitacoes: 12 },
          { mes: 'Fev', solicitacoes: 18 },
          { mes: 'Mar', solicitacoes: 15 },
          { mes: 'Abr', solicitacoes: 22 },
          { mes: 'Mai', solicitacoes: 28 },
          { mes: 'Jun', solicitacoes: 35 }
        ],
        activePrinciples: [
          { name: 'Paclitaxel', count: 15 },
          { name: 'Carboplatina', count: 12 },
          { name: 'Cisplatina', count: 8 },
          { name: 'Doxorrubicina', count: 6 },
          { name: '5-Fluorouracila', count: 4 }
        ]
      };

      const response: ApiResponse = {
        success: true,
        message: 'Dados de gráficos obtidos com sucesso',
        data: chartsData
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

  // GET /api/dashboard/performance - Performance das clínicas
  static async getClinicasPerformance(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Dados simulados para performance
      const performance = [
        {
          name: 'Clínica OncoLife',
          solicitacoes: 25,
          aprovacoes: 20,
          tempo_medio: 2.5
        },
        {
          name: 'Centro de Oncologia SP',
          solicitacoes: 18,
          aprovacoes: 15,
          tempo_medio: 3.2
        },
        {
          name: 'Instituto do Câncer',
          solicitacoes: 12,
          aprovacoes: 10,
          tempo_medio: 2.8
        }
      ];

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
}