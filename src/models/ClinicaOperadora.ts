import { query } from '../config/database';
import { Operadora } from '../types/operadora';

export class ClinicaOperadoraModel {
  static async getOperadorasByClinica(clinicaId: number): Promise<Operadora[]> {
    console.log(`🔍 getOperadorasByClinica: Buscando operadoras para clinica_id=${clinicaId}`);
    const sql = `
      SELECT o.*
      FROM clinicas_operadoras co
      INNER JOIN operadoras o ON o.id = co.operadora_id
      WHERE co.clinica_id = ? AND co.status = 'ativo' AND o.status = 'ativo'
      ORDER BY o.nome ASC
    `;

    const result = await query(sql, [clinicaId]);
    console.log(`✅ getOperadorasByClinica: Query retornou ${result.length} operadoras para clinica_id=${clinicaId}`);
    if (result.length > 0) {
      console.log(`📊 Operadoras encontradas:`, (result as any[]).map(op => ({ id: op.id, nome: op.nome })));
    }
    return (result as any[]).map((row) => row as Operadora);
  }

  static async getOperadoraIdsByClinica(clinicaId: number): Promise<number[]> {
    const sql = `
      SELECT operadora_id
      FROM clinicas_operadoras
      WHERE clinica_id = ? AND status = 'ativo'
    `;

    const rows = await query(sql, [clinicaId]);
    return (rows as any[])
      .map((row) => Number(row.operadora_id))
      .filter((id) => Number.isInteger(id));
  }

  static async setOperadorasForClinica(clinicaId: number, operadoraIds: number[] | undefined): Promise<void> {
    if (!Array.isArray(operadoraIds)) {
      await query('DELETE FROM clinicas_operadoras WHERE clinica_id = ?', [clinicaId]);
      return;
    }

    const sanitizedIds = operadoraIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    await query('DELETE FROM clinicas_operadoras WHERE clinica_id = ?', [clinicaId]);

    if (sanitizedIds.length === 0) {
      return;
    }

    const values = sanitizedIds.map((id) => [clinicaId, id]);
    const placeholders = values.map(() => '(?, ?)').join(', ');
    const flatValues = values.flat();
    const insertSql = `
      INSERT INTO clinicas_operadoras (clinica_id, operadora_id)
      VALUES ${placeholders}
    `;
    await query(insertSql, flatValues);
  }

  static async getClinicasByOperadora(operadoraId: number): Promise<number[]> {
    const sql = `
      SELECT clinica_id
      FROM clinicas_operadoras
      WHERE operadora_id = ? AND status = 'ativo'
    `;

    const rows = await query(sql, [operadoraId]);
    return (rows as any[])
      .map((row) => Number(row.clinica_id))
      .filter((id) => Number.isInteger(id));
  }

  static async getOperadorasByClinicaIds(clinicaIds: number[]): Promise<Record<number, Operadora[]>> {
    if (clinicaIds.length === 0) {
      return {};
    }

    const placeholders = clinicaIds.map(() => '?').join(', ');
    const sql = `
      SELECT co.clinica_id, o.*
      FROM clinicas_operadoras co
      INNER JOIN operadoras o ON o.id = co.operadora_id
      WHERE co.clinica_id IN (${placeholders}) AND co.status = 'ativo' AND o.status = 'ativo'
      ORDER BY o.nome ASC
    `;

    const rows = await query(sql, clinicaIds);
    const map: Record<number, Operadora[]> = {};

    (rows as any[]).forEach((row) => {
      const clinicaId = Number(row.clinica_id);
      if (!Number.isInteger(clinicaId)) {
        return;
      }
      if (!map[clinicaId]) {
        map[clinicaId] = [];
      }
      const { clinica_id, ...operadoraData } = row;
      map[clinicaId].push(operadoraData as Operadora);
    });

    return map;
  }
}
