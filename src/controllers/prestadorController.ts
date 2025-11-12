// src/controllers/prestadorController.ts

import { Request, Response } from 'express';
import { PrestadorModel } from '../models/Prestador';

export class PrestadorController {
  
  // Listar prestadores por clínica
  static async getPrestadoresByClinica(req: Request, res: Response): Promise<void> {
    try {
      const { clinica_id } = req.query;

      if (!clinica_id) {
        res.status(400).json({
          success: false,
          message: 'ID da clínica é obrigatório'
        });
        return;
      }

      const prestadores = await PrestadorModel.findByClinicaId(Number(clinica_id));

      res.json({
        success: true,
        message: 'Prestadores encontrados',
        data: prestadores
      });
    } catch (error) {
      console.error('❌ Erro ao buscar prestadores por clínica:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar todos os prestadores (para admin)
  static async getAllPrestadores(req: Request, res: Response): Promise<void> {
    try {
      const prestadores = await PrestadorModel.findAll();

      res.json({
        success: true,
        message: 'Prestadores encontrados',
        data: prestadores
      });
    } catch (error) {
      console.error('❌ Erro ao buscar prestadores:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar prestador por ID
  static async getPrestadorById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID do prestador é obrigatório'
        });
        return;
      }

      const prestador = await PrestadorModel.findById(Number(id));

      if (!prestador) {
        res.status(404).json({
          success: false,
          message: 'Prestador não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Prestador encontrado',
        data: prestador
      });
    } catch (error) {
      console.error('❌ Erro ao buscar prestador por ID:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
