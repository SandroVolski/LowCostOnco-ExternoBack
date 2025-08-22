import { Request, Response } from 'express';
import { PacienteModel } from '../models/Paciente';
import { PacienteCreateInput, PacienteUpdateInput, ApiResponse } from '../types';
import { invalidateCache } from '../middleware/cache';

export class PacienteController {
  
  // GET /api/pacientes - Listar todos os pacientes
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      
      const result = await PacienteModel.findAll({ page, limit, search });
      
      const response: ApiResponse = {
        success: true,
        message: 'Pacientes encontrados com sucesso',
        data: result
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao listar pacientes:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao listar pacientes',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/pacientes/:id - Buscar paciente por ID
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const paciente = await PacienteModel.findById(id);
      
      if (!paciente) {
        const response: ApiResponse = {
          success: false,
          message: 'Paciente não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Paciente encontrado com sucesso',
        data: paciente
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar paciente:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar paciente',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/pacientes/clinica/:clinicaId - Buscar pacientes por clínica
  static async getByClinica(req: Request, res: Response): Promise<void> {
    try {
      const clinicaId = parseInt(req.params.clinicaId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      
      if (isNaN(clinicaId)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da clínica inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const result = await PacienteModel.findByClinicaId(clinicaId, { page, limit, search });
      
      const response: ApiResponse = {
        success: true,
        message: 'Pacientes da clínica encontrados com sucesso',
        data: result
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar pacientes da clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar pacientes da clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // POST /api/pacientes - Criar novo paciente
  static async store(req: Request, res: Response): Promise<void> {
    try {
      const pacienteData: PacienteCreateInput = req.body;
      
      // Validações básicas (Codigo tornou-se opcional)
      if (!pacienteData.Paciente_Nome || !pacienteData.Data_Nascimento || !pacienteData.Cid_Diagnostico || !pacienteData.Sexo || !pacienteData.stage || !pacienteData.treatment || !pacienteData.status) {
        const response: ApiResponse = {
          success: false,
          message: 'Campos obrigatórios: Paciente_Nome, Data_Nascimento, Sexo, Cid_Diagnostico, stage, treatment, status'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se código já existe (apenas se informado)
      if (pacienteData.Codigo) {
        const codigoExists = await PacienteModel.checkCodigoExists(pacienteData.Codigo);
        if (codigoExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Já existe um paciente com este código'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      // Verificar se CPF já existe (se fornecido)
      if (pacienteData.cpf) {
        const cpfExists = await PacienteModel.checkCpfExists(pacienteData.cpf);
        if (cpfExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Já existe um paciente com este CPF'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      const novoPaciente = await PacienteModel.create(pacienteData);
      
      // Invalida cache de listagens de pacientes
      invalidateCache('/api/pacientes');
      
      const response: ApiResponse = {
        success: true,
        message: 'Paciente criado com sucesso',
        data: novoPaciente
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao criar paciente',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // PUT /api/pacientes/:id - Atualizar paciente
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const pacienteData: PacienteUpdateInput = req.body;
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se paciente existe
      const pacienteExists = await PacienteModel.findById(id);
      if (!pacienteExists) {
        const response: ApiResponse = {
          success: false,
          message: 'Paciente não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      // Verificar se código já existe (se estiver sendo atualizado)
      if (pacienteData.Codigo) {
        const codigoExists = await PacienteModel.checkCodigoExists(pacienteData.Codigo, id);
        if (codigoExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Já existe um paciente com este código'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      // Verificar se CPF já existe (se estiver sendo atualizado)
      if (pacienteData.cpf) {
        const cpfExists = await PacienteModel.checkCpfExists(pacienteData.cpf, id);
        if (cpfExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Já existe um paciente com este CPF'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      const pacienteAtualizado = await PacienteModel.update(id, pacienteData);
      
      // Invalida cache de listagens de pacientes
      invalidateCache('/api/pacientes');
      
      const response: ApiResponse = {
        success: true,
        message: 'Paciente atualizado com sucesso',
        data: pacienteAtualizado
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao atualizar paciente',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // DELETE /api/pacientes/:id - Deletar paciente
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se paciente existe
      const pacienteExists = await PacienteModel.findById(id);
      if (!pacienteExists) {
        const response: ApiResponse = {
          success: false,
          message: 'Paciente não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      const deleted = await PacienteModel.delete(id);
      
      if (deleted) {
        // Invalida cache de listagens de pacientes
        invalidateCache('/api/pacientes');
        const response: ApiResponse = {
          success: true,
          message: 'Paciente deletado com sucesso'
        };
        res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao deletar paciente'
        };
        res.status(500).json(response);
      }
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao deletar paciente',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
}