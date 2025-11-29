import { Request, Response } from 'express';
import { PacienteModel } from '../models/Paciente';
import { PacienteCreateInput, PacienteUpdateInput, ApiResponse } from '../types';
import { invalidateCache } from '../middleware/cache';

interface AuthRequest extends Request {
  user?: {
    id: number;
    clinicaId?: number;
    role?: string;
    medicoId?: number;
  };
}

export class PacienteController {
  
  // GET /api/pacientes - Listar todos os pacientes
  static async index(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';

      console.log(`🔍 [PacienteController.index] Listando pacientes - page=${page}, limit=${limit}, search="${search}"`);

      // Se usuário é operadora, listar por operadoraId
      const user: any = req.user;
      console.log(`👤 [PacienteController.index] Usuário:`, { tipo: user?.tipo, operadoraId: user?.operadoraId, clinicaId: user?.clinicaId, id: user?.id });
      
      if (user?.tipo === 'operadora' && user?.operadoraId) {
        console.log(`🔄 [PacienteController.index] Buscando pacientes por operadora_id=${user.operadoraId}`);
        const result = await PacienteModel.findByOperadoraId(user.operadoraId, { page, limit, search });
        console.log(`✅ [PacienteController.index] Encontrados ${result.data?.length || 0} pacientes`);
        const response: ApiResponse = {
          success: true,
          message: 'Pacientes encontrados com sucesso',
          data: result
        };
        res.json(response);
        return;
      }

      const clinicaId = user?.clinicaId || user?.id || null;

      if (!clinicaId) {
        console.log(`❌ [PacienteController.index] Clínica não identificada no token`);
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não identificada no token'
        };
        res.status(401).json(response);
        return;
      }

      console.log(`🔄 [PacienteController.index] Buscando pacientes por clinica_id=${clinicaId}`);
      const result = await PacienteModel.findByClinicaId(clinicaId, { page, limit, search });
      console.log(`✅ [PacienteController.index] Encontrados ${result.data?.length || 0} pacientes`);

      const response: ApiResponse = {
        success: true,
        message: 'Pacientes encontrados com sucesso',
        data: result
      };

      res.json(response);
    } catch (error) {
      console.error('❌ [PacienteController.index] Erro ao listar pacientes:', error);
      if (error instanceof Error) {
        console.error('   Tipo:', error.constructor.name);
        console.error('   Mensagem:', error.message);
        console.error('   Stack:', error.stack);
      }
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao listar pacientes',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/pacientes/:id - Buscar paciente por ID
  static async show(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const clinicaId = req.user?.clinicaId || req.user?.id || null;
      
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

      if (clinicaId && paciente.clinica_id !== clinicaId) {
        const response: ApiResponse = {
          success: false,
          message: 'Acesso negado ao paciente solicitado'
        };
        res.status(403).json(response);
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
  static async getByClinica(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicaId = parseInt(req.params.clinicaId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const tokenClinicaId = req.user?.clinicaId || req.user?.id || null;
      
      if (isNaN(clinicaId)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da clínica inválido'
        };
        res.status(400).json(response);
        return;
      }

      if (tokenClinicaId && tokenClinicaId !== clinicaId) {
        const response: ApiResponse = {
          success: false,
          message: 'Acesso negado aos pacientes de outra clínica'
        };
        res.status(403).json(response);
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
  static async store(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pacienteData: PacienteCreateInput = req.body;
      const clinicaId = req.user?.clinicaId || req.user?.id || null;

      if (!clinicaId) {
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não identificada no token'
        };
        res.status(401).json(response);
        return;
      }

      // Forçar clinica_id do token
      (pacienteData as any).clinica_id = clinicaId;
      
      // Validações básicas
      if (!pacienteData.Paciente_Nome || !pacienteData.Data_Nascimento || !pacienteData.Cid_Diagnostico || !pacienteData.Sexo || !pacienteData.stage || !pacienteData.treatment || !pacienteData.status) {
        const response: ApiResponse = {
          success: false,
          message: 'Campos obrigatórios: Paciente_Nome, Data_Nascimento, Sexo, Cid_Diagnostico, stage, treatment, status'
        };
        res.status(400).json(response);
        return;
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
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const pacienteData: PacienteUpdateInput = req.body;
      const clinicaId = req.user?.clinicaId || req.user?.id || null;
      
      console.log(`🔍 [PacienteController.update] Iniciando atualização do paciente ID=${id}`);
      console.log(`📥 [PacienteController.update] Dados recebidos:`, JSON.stringify(pacienteData, null, 2));
      console.log(`👤 [PacienteController.update] Clinica ID do usuário: ${clinicaId}`);
      
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
        console.log(`❌ [PacienteController.update] Paciente ID=${id} não encontrado`);
        const response: ApiResponse = {
          success: false,
          message: 'Paciente não encontrado'
        };
        res.status(404).json(response);
        return;
      }

      console.log(`✅ [PacienteController.update] Paciente encontrado: clinica_id=${pacienteExists.clinica_id}`);

      if (clinicaId && pacienteExists.clinica_id !== clinicaId) {
        console.log(`❌ [PacienteController.update] Acesso negado: usuário clinica_id=${clinicaId}, paciente clinica_id=${pacienteExists.clinica_id}`);
        const response: ApiResponse = {
          success: false,
          message: 'Acesso negado ao paciente solicitado'
        };
        res.status(403).json(response);
        return;
      }
      
      // Verificar se CPF já existe (se estiver sendo atualizado)
      if (pacienteData.cpf) {
        const cpfExists = await PacienteModel.checkCpfExists(pacienteData.cpf, id);
        if (cpfExists) {
          console.log(`❌ [PacienteController.update] CPF já existe: ${pacienteData.cpf}`);
          const response: ApiResponse = {
            success: false,
            message: 'Já existe um paciente com este CPF'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      console.log(`🔄 [PacienteController.update] Chamando PacienteModel.update...`);
      const pacienteAtualizado = await PacienteModel.update(id, pacienteData);
      
      if (!pacienteAtualizado) {
        console.log(`❌ [PacienteController.update] PacienteModel.update retornou null`);
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao atualizar paciente - nenhuma linha foi afetada'
        };
        res.status(500).json(response);
        return;
      }
      
      console.log(`✅ [PacienteController.update] Paciente atualizado com sucesso`);
      
      // Invalida cache de listagens de pacientes
      invalidateCache('/api/pacientes');
      
      const response: ApiResponse = {
        success: true,
        message: 'Paciente atualizado com sucesso',
        data: pacienteAtualizado
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ [PacienteController.update] Erro ao atualizar paciente:', error);
      if (error instanceof Error) {
        console.error('   Tipo:', error.constructor.name);
        console.error('   Mensagem:', error.message);
        console.error('   Stack:', error.stack);
      }
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao atualizar paciente',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // DELETE /api/pacientes/:id - Deletar paciente
  static async destroy(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const clinicaId = req.user?.clinicaId || req.user?.id || null;
      
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

      if (clinicaId && pacienteExists.clinica_id !== clinicaId) {
        const response: ApiResponse = {
          success: false,
          message: 'Acesso negado ao paciente solicitado'
        };
        res.status(403).json(response);
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

  // GET /api/mobile/pacientes/medico/:medicoId
  static async getByMedico(req: AuthRequest, res: Response): Promise<void> {
    try {
      const medicoId = parseInt(req.params.medicoId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || '';

      if (isNaN(medicoId)) {
        const response: ApiResponse = { success: false, message: 'ID do médico inválido' };
        res.status(400).json(response);
        return;
      }

      // Autorização básica: se token possui medicoId e for diferente, negar
      if (req.user?.medicoId && req.user.medicoId !== medicoId) {
        const response: ApiResponse = { success: false, message: 'Acesso negado a pacientes de outro médico' };
        res.status(403).json(response);
        return;
      }

      // Reaproveitar model por clínica, assumindo que cada médico pertence a uma clínica.
      // Em sistemas com relação médico->clínica, obter clinicaId via token.
      const clinicaId = req.user?.clinicaId || req.user?.id || null;
      if (!clinicaId) {
        const response: ApiResponse = { success: false, message: 'Clínica não identificada no token' };
        res.status(401).json(response);
        return;
      }

      // Por ora, usamos findByClinicaId + filtro no nome/código via search.
      // Se houver coluna Medico_Id em Pacientes_Clinica, ideal criar um método findByMedicoId.
      const result = await PacienteModel.findByClinicaId(clinicaId, { page, limit, search });

      const response: ApiResponse = {
        success: true,
        message: 'Pacientes do médico encontrados com sucesso',
        data: result
      };
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar pacientes do médico:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar pacientes do médico',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
}