// src/utils/pdfGenerator.ts - VERSÃO CORRIGIDA COM HEADER CENTRALIZADO E FOOTER SOMENTE NA ÚLTIMA PÁGINA

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { SolicitacaoAutorizacao } from '../types/solicitacao';

// Função para formatar data
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

// Função para formatar status em português
const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pendente': 'Pendente',
    'aprovada': 'Aprovada',
    'rejeitada': 'Rejeitada',
    'em_analise': 'Em Análise'
  };
  
  return statusMap[status] || status;
};

// ✅ FUNÇÃO MELHORADA: Formatar medicamentos do protocolo com espaços dedicados
const formatMedicamentosProtocolo = (protocoloMedicamentosJson?: string): string => {
  if (!protocoloMedicamentosJson) return '';
  
  try {
    const medicamentos = JSON.parse(protocoloMedicamentosJson);
    
    if (!Array.isArray(medicamentos)) return '';
    
    // ✅ NOVA FORMATAÇÃO: Espaços dedicados com campos separados
    return medicamentos.map((med: any, index: number) => {
      const nome = med.nome || '';
      const dose = med.dose || '';
      const unidade = med.unidade_medida || '';
      const via = med.via_adm || '';
      const dias = med.dias_adm || '';
      const frequencia = med.frequencia || '';
      const observacoes = med.observacoes || '';
      
      // Criar espaço dedicado para cada medicamento
      return `
<div class="medication-dedicated-space" style="
  border: 2px solid #2c3e50;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
  background: #f8f9fa;
  page-break-inside: avoid;
">
  <div style="
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: center;
    background: #2c3e50;
    color: white;
    padding: 4px;
    border-radius: 4px;
  ">MEDICAMENTO ${index + 1}</div>
  
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9px;">
    <div style="display: flex; flex-direction: column;">
      <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Nome do Medicamento:</span>
      <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${nome}</div>
    </div>
    
    <div style="display: flex; flex-direction: column;">
      <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Dose:</span>
      <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${dose}${unidade}</div>
    </div>
    
    <div style="display: flex; flex-direction: column;">
      <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Via de Administração:</span>
      <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${via}</div>
    </div>
    
    <div style="display: flex; flex-direction: column;">
      <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Dias de Administração:</span>
      <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${dias}</div>
    </div>
    
    <div style="display: flex; flex-direction: column;">
      <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Frequência:</span>
      <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${frequencia}</div>
    </div>
    
    ${observacoes ? `
    <div style="display: flex; flex-direction: column; grid-column: 1 / -1;">
      <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Observações:</span>
      <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${observacoes}</div>
    </div>
    ` : ''}
  </div>
</div>`;
    }).join('');
    
  } catch (error) {
    console.warn('⚠️  Erro ao formatar medicamentos do protocolo:', error);
    return '';
  }
};

// ✅ FUNÇÃO CORRIGIDA: Formatar medicamentos manuais com espaços dedicados
const formatMedicamentosManuais = (medicamentosString?: string): string => {
    if (!medicamentosString || medicamentosString.trim() === '') {
        return '';
    }

    try {
        // ✅ CORREÇÃO: Primeiro separar por ponto e vírgula, depois por quebras de linha
        let medicamentos: string[] = [];

        // Dividir por ponto e vírgula primeiro
        const medicamentosPorPontoVirgula = medicamentosString.split(';');

        // Para cada parte, dividir por quebras de linha
        medicamentosPorPontoVirgula.forEach((part: string, index: number) => {
            const medicamentosPorLinha = part.split('\n');
            medicamentosPorLinha.forEach((med: string) => {
              const medTrimmed = med.trim();
              if (medTrimmed.length > 0) {
                  medicamentos.push(medTrimmed);
              }
            });
        });

        // Remover duplicatas e filtrar vazios
        medicamentos = [...new Set(medicamentos)].filter((med: string) => med.length > 0);

        if (medicamentos.length === 0) {
            return '';
        }

        const resultado = medicamentos.map((med, index) => {
            // Tentar extrair informações do medicamento manual
            const partes = med.split(' ');

            // Padrão mais flexível para extrair informações
            let nome = '';
            let dose = '';
            let unidade = '';
            let via = '';
            let dias = '';
            let frequencia = '';

            if (partes.length >= 3) {
                // Tentar extrair baseado em padrões conhecidos
                const viaPatterns = ['EV', 'VO', 'IM', 'SC', 'IT', 'IP', 'TOP'];
                const unidadePatterns = ['mg', 'mg/m²', 'mg/kg', 'AUC', 'UI', 'mcg', 'ml', 'g'];

                // Encontrar via de administração
                const viaIndex = partes.findIndex(part => viaPatterns.includes(part));
                if (viaIndex !== -1) {
                    via = partes[viaIndex];

                    // Encontrar dose (número seguido de unidade)
                    const doseRegex = /^(\d+(?:\.\d+)?)(mg|mg\/m²|mg\/kg|AUC|UI|mcg|ml|g)$/;
                    let doseIndex = -1;
                    let doseMatch = null;

                    for (let i = 0; i < partes.length; i++) {
                      const match = partes[i].match(doseRegex);
                      if (match) {
                        doseIndex = i;
                        doseMatch = match;
                        break;
                      }
                    }

                    if (doseIndex !== -1 && doseMatch) {
                        dose = doseMatch[1] + doseMatch[2];
                        unidade = doseMatch[2];

                        // Nome é tudo antes da dose
                        nome = partes.slice(0, doseIndex).join(' ');

                        // Dias e frequência são o resto após a via
                        const restParts = partes.slice(viaIndex + 1);
                        if (restParts.length >= 2) {
                          dias = restParts[0];
                          frequencia = restParts.slice(1).join(' ');
                        } else if (restParts.length === 1) {
                          dias = restParts[0];
                          frequencia = '';
                        }
                    }
                }
            }

            // Se conseguiu extrair informações estruturadas
            if (nome && dose && via) {
                return `
        <div class="medication-dedicated-space" style="
          border: 2px solid #2c3e50;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 8px;
          background: #f8f9fa;
          page-break-inside: avoid;
        ">
          <div style="
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 6px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
            background: #2c3e50;
            color: white;
            padding: 4px;
            border-radius: 4px;
          ">MEDICAMENTO ${index + 1}</div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9px;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Nome do Medicamento:</span>
              <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${nome}</div>
            </div>
            
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Dose:</span>
              <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${dose}</div>
            </div>
            
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Via de Administração:</span>
              <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${via}</div>
            </div>
            
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Dias de Administração:</span>
              <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${dias}</div>
            </div>
            
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Frequência:</span>
              <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${frequencia}</div>
            </div>
          </div>
        </div>`;
            } else {
                return `
        <div class="medication-dedicated-space" style="
          border: 2px solid #2c3e50;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 8px;
          background: #f8f9fa;
          page-break-inside: avoid;
        ">
          <div style="
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 6px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
            background: #2c3e50;
            color: white;
            padding: 4px;
            border-radius: 4px;
          ">MEDICAMENTO ${index + 1}</div>
          
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 600; color: #495057; margin-bottom: 2px; text-transform: uppercase; font-size: 8px;">Prescrição Completa:</span>
            <div style="background: white; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; min-height: 16px; font-weight: 500;">${med}</div>
          </div>
        </div>`;
            }
        }).join('');

        return resultado;
    } catch (error) {
      console.error('❌ Erro ao formatar medicamentos manuais:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
      return medicamentosString || '';
    }
};

// Função para carregar a logo padrão e converter para base64
const getDefaultLogoBase64 = (): string => {
  try {
    // Caminho correto para a logo padrão conforme solicitado
    const logoPath = path.resolve('C:\\Users\\sandr\\OneDrive\\Área de Trabalho\\Trabalho\\Code\\SystemVSCode\\system-douglas2\\Projeto\\SiteExterno-ClinicaOperadoraPlanosaude\\Teste\\sistema-clinicas-backend\\src\\images\\logoPadrao.png');
    
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = logoBuffer.toString('base64');
      return `data:image/png;base64,${logoBase64}`;
    }
  } catch (error) {
    console.warn('⚠️  Não foi possível carregar a logo padrão do caminho especificado:', error);
  }
  
  // Fallback para logo padrão relativa se o caminho absoluto não funcionar
  try {
    const logoPathRelative = path.join(__dirname, '..', 'images', 'logoPadrao.png');
    
    if (fs.existsSync(logoPathRelative)) {
      const logoBuffer = fs.readFileSync(logoPathRelative);
      const logoBase64 = logoBuffer.toString('base64');
      return `data:image/png;base64,${logoBase64}`;
    }
  } catch (error) {
    console.warn('⚠️  Não foi possível carregar a logo padrão relativa:', error);
  }
  
  // Fallback final para SVG
  return `data:image/svg+xml;base64,${btoa(`
<svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="50" height="50" rx="8" fill="#2c3e50"/>
  <path d="M25 10 L25 40 M10 25 L40 25" stroke="white" stroke-width="3" stroke-linecap="round"/>
  <circle cx="25" cy="25" r="8" fill="none" stroke="white" stroke-width="2"/>
  <path d="M20 20 L30 30 M30 20 L20 30" stroke="#c6d651" stroke-width="1.5" stroke-linecap="round"/>
</svg>
`)}`;
};

// Template HTML para o Header nativo do PDF - PERFEITAMENTE CENTRALIZADO
const generateHeaderTemplate = (solicitacao: SolicitacaoAutorizacao, clinicLogo?: string): string => {
  const logoToUse = clinicLogo && clinicLogo.trim() !== '' ? clinicLogo : getDefaultLogoBase64();
  
  return `
    <div style="
      width: 100vw; 
      height: 100px;
      margin: 0; 
      padding: 0;
      font-size: 11px; 
      font-family: Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      position: relative;
      box-sizing: border-box;
    ">
      <div style="
        width: 100%;
        height: 100%;
        background: #f8f9fa;
        border-bottom: 3px solid #2c3e50;
        padding: 15px 40px;
        margin: 0;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <!-- Logo à esquerda - posição absoluta -->
        <div style="
          position: absolute;
          left: 40px;
          top: 50%;
          transform: translateY(-50%);
          display: flex; 
          align-items: center; 
          gap: 10px;
        ">
          <img src="${logoToUse}" style="
            width: 45px;
            height: 45px;
            border-radius: 6px;
            background: white;
            padding: 5px;
            border: 2px solid #dee2e6;
            object-fit: contain;
          " />
        </div>
        
        <!-- Título absolutamente centralizado -->
        <div style="
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          white-space: nowrap;
        ">
          <h1 style="
            font-size: 14px;
            font-weight: bold;
            margin: 0;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Autorização de Tratamento Oncológico</h1>
          <p style="
            font-size: 9px;
            font-weight: normal;
            margin: 2px 0 0 0;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          ">Solicitação de Processamento - Quimioterapia Antineoplásica</p>
        </div>
        
        <!-- Informações da solicitação à direita - posição absoluta -->
        <div style="
          position: absolute;
          right: 40px;
          top: 50%;
          transform: translateY(-50%);
          text-align: right;
        ">
          <div style="
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #2c3e50;
            font-family: 'Courier New', monospace;
          ">SOL-${String(solicitacao.id || 'NOVA').padStart(6, '0')}</div>
          <div style="
            display: inline-block;
            padding: 3px 8px;
            border-radius: 2px;
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            ${solicitacao.status === 'pendente' ? 'background: #fff3cd; color: #856404;' : ''}
            ${solicitacao.status === 'aprovada' ? 'background: #d4edda; color: #155724;' : ''}
            ${solicitacao.status === 'rejeitada' ? 'background: #f8d7da; color: #721c24;' : ''}
            ${solicitacao.status === 'em_analise' ? 'background: #d1ecf1; color: #0c5460;' : ''}
          ">${formatStatus(solicitacao.status || 'pendente')}</div>
        </div>
      </div>
    </div>
  `;
};

// Template HTML para o Footer nativo do PDF - SOMENTE NA ÚLTIMA PÁGINA E LARGURA TOTAL
const generateFooterTemplate = (): string => {
  return `
    <div style="
      width: 100vw; 
      height: 80px;
      margin: 0; 
      padding: 0;
      font-size: 9px; 
      font-family: Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #2c3e50;
      color: white;
      border-top: 2px solid #34495e;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      position: relative;
    ">
      <div style="
        padding: 0 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      ">
        <div style="
          text-align: left;
          flex: 1;
        ">
          <h4 style="
            font-size: 10px;
            font-weight: 600;
            margin: 0 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Sistema de Gestão</h4>
          <p style="
            opacity: 0.9;
            line-height: 1.2;
            margin: 0;
            font-size: 8px;
          ">OnkoLink - Oncologia Clínica</p>
        </div>
        
        <div style="
          text-align: center;
          flex: 1;
        ">
          <p style="
            opacity: 0.9;
            line-height: 1.2;
            margin: 0;
            font-size: 8px;
          ">Página <span class="pageNumber"></span> de <span class="totalPages"></span></p>
        </div>
        
        <div style="
          text-align: right;
          flex: 1;
        ">
          <h4 style="
            font-size: 10px;
            font-weight: 600;
            margin: 0 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Documento Gerado</h4>
          <p style="
            opacity: 0.9;
            line-height: 1.2;
            margin: 0;
            font-size: 8px;
          ">${formatDate(new Date().toISOString())} - ${new Date().toLocaleTimeString('pt-BR')}</p>
          <p style="
            opacity: 0.9;
            line-height: 1.2;
            margin: 0;
            font-size: 8px;
          ">Documento Oficial</p>
        </div>
      </div>
    </div>
  `;
};

// Template HTML principal SEM FOOTER (footer será nativo)
const generateHTMLTemplate = (solicitacao: SolicitacaoAutorizacao): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Autorização de Tratamento Oncológico - ${solicitacao.cliente_nome}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Source Sans Pro', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #2c3e50;
            background: white;
            padding: 5px 15px 10px 15px; /* Reduzido de 10px 20px 15px 20px */
        }
        
        /* Seções do formulário */
        .section {
            margin-bottom: 3px; /* Reduzido de 4px */
            overflow: hidden;
            page-break-inside: avoid;
        }
        
        .section-header {
            background: #f8f9fa;
            padding: 4px 10px; /* Reduzido de 6px 12px */
            border-bottom: 1px solid #dee2e6;
            border-radius: 3px 3px 0 0;
        }
        
        .section-title {
            font-size: 11px; /* Reduzido de 12px */
            font-weight: 700;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px; /* Reduzido de 8px */
            font-family: 'Source Sans Pro', Arial, sans-serif;
        }
        
        .section-number {
            background: #2c3e50;
            color: white;
            width: 18px; /* Reduzido de 20px */
            height: 18px; /* Reduzido de 20px */
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px; /* Reduzido de 10px */
            font-weight: 700;
            font-family: 'Source Sans Pro', Arial, sans-serif;
        }
        
        .section-content {
            padding: 6px 10px; /* Reduzido de 8px 12px */
            background: white;
        }
        
        /* Grid layouts */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px; /* Reduzido de 6px */
            margin-bottom: 4px; /* Reduzido de 6px */
        }
        
        .info-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 4px; /* Reduzido de 6px */
            margin-bottom: 4px; /* Reduzido de 6px */
        }
        
        .info-grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 3px; /* Reduzido de 4px */
            margin-bottom: 4px; /* Reduzido de 6px */
        }
        
        .staging-grid {
            display: grid;
            grid-template-columns: 70px 70px 70px 1fr;
            gap: 3px; /* Reduzido de 4px */
            margin-bottom: 4px; /* Reduzido de 6px */
            padding: 4px; /* Reduzido de 6px */
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 3px;
        }
        
        .treatment-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 4px; /* Reduzido de 6px */
            margin-bottom: 4px; /* Reduzido de 6px */
        }
        
        .info-item {
            margin-bottom: 3px; /* Reduzido de 4px */
        }
        
        .info-label {
            font-weight: 600;
            color: #495057;
            display: block;
            margin-bottom: 1px; /* Reduzido de 2px */
            font-size: 8px; /* Reduzido de 9px */
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-family: 'Source Sans Pro', Arial, sans-serif;
        }
        
        .info-value {
            background: white;
            border: 1px solid #ced4da;
            border-radius: 2px;
            padding: 3px 6px; /* Reduzido de 4px 8px */
            display: block;
            min-height: 14px; /* Reduzido de 16px */
            font-weight: 400;
            color: #212529;
            font-size: 9px; /* Reduzido de 10px */
            font-family: 'Source Sans Pro', Arial, sans-serif;
        }
        
        .info-value:not(:empty) {
            background: #fdfdfd;
            border-color: #adb5bd;
        }
        
        .full-width {
            grid-column: 1 / -1;
        }
        
        /* Seção de medicamentos */
        .medication-section {
            margin-bottom: 4px; /* Reduzido de 6px */
        }
        
        .medication-title {
            font-weight: 600;
            color: #495057;
            margin-bottom: 3px; /* Reduzido de 4px */
            font-size: 9px; /* Reduzido de 10px */
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-family: 'Source Sans Pro', Arial, sans-serif;
        }
        
        /* Seção de assinatura */
        .signature-section {
            background: white;
            border: 2px solid #2c3e50;
            border-radius: 4px;
            padding: 10px; /* Reduzido de 15px */
            margin: 10px 0 8px 0; /* Reduzido de 15px 0 10px 0 */
            page-break-inside: avoid;
        }
        
        .signature-title {
            font-size: 11px; /* Reduzido de 12px */
            font-weight: 700;
            color: #2c3e50;
            text-transform: uppercase;
            margin-bottom: 8px; /* Reduzido de 10px */
            text-align: center;
            letter-spacing: 0.5px;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 12px; /* Reduzido de 18px */
            align-items: start;
        }
        
        .signature-box {
            border: 1px solid #6c757d;
            border-radius: 2px;
            padding: 20px 10px; /* Reduzido de 25px 12px */
            text-align: center;
            margin-top: 6px; /* Reduzido de 8px */
            background: white;
            min-height: 40px; /* Reduzido de 50px */
        }
        
        .signature-label {
            font-size: 8px; /* Reduzido de 9px */
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 6px; /* Reduzido de 8px */
        }
        
        .authorization-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 3px;
            padding: 8px; /* Reduzido de 12px */
            text-align: center;
            min-height: 40px; /* Reduzido de 50px */
        }
        
        .authorization-approved {
            background: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
        }
        
        /* Texto em áreas */
        .text-area-value {
            background: white;
            border: 1px solid #ced4da;
            border-radius: 2px;
            padding: 6px 8px; /* Reduzido de 8px 10px */
            min-height: 20px;
            font-size: 9px; /* Reduzido de 10px */
            line-height: 1.3;
            color: #212529;
            font-family: 'Source Sans Pro', Arial, sans-serif;
        }
        
        /* Status */
        .status-pending {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 3px;
            padding: 6px; /* Reduzido de 8px */
            margin: 4px 0; /* Reduzido de 6px 0 */
            font-size: 9px; /* Reduzido de 10px */
            color: #856404;
        }
        
        /* Medicamentos dedicados - OTIMIZADO PARA ECONOMIA DE PÁGINAS */
        .medication-dedicated-space {
            border: 2px solid #2c3e50;
            border-radius: 6px;
            padding: 8px; /* Reduzido de 12px */
            margin-bottom: 8px; /* Reduzido de 15px */
            background: #f8f9fa;
            page-break-inside: avoid;
        }
        
        .medication-dedicated-space .medication-dedicated-space {
            margin-bottom: 8px; /* Reduzido de 15px */
        }
        
        .medication-dedicated-space .medication-dedicated-space .medication-dedicated-space {
            margin-bottom: 8px; /* Reduzido de 15px */
        }
        
        @media print {
            html, body {
                height: 100%;
                margin: 0;
                padding: 0;
            }
            
            body { 
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                padding: 15px 25px 20px 25px;
            }
            
            .section {
                page-break-inside: avoid;
            }
            
            .signature-section {
                page-break-inside: avoid !important;
            }
        }
    </style>
</head>
<body>
    <!-- Seção 1: Dados da Instituição e Paciente -->
    <div class="section">
        <div class="section-header">
            <div class="section-title">
                <div class="section-number">1</div>
                Identificação da Instituição e Paciente
            </div>
        </div>
        <div class="section-content">
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Instituição Solicitante</span>
                    <span class="info-value">${solicitacao.hospital_nome || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Código da Instituição</span>
                    <span class="info-value">${solicitacao.hospital_codigo || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Nome Completo do Paciente</span>
                    <span class="info-value">${solicitacao.cliente_nome || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Registro do Paciente</span>
                    <span class="info-value">${solicitacao.cliente_codigo || ''}</span>
                </div>
            </div>
            
            <div class="info-grid-4">
                <div class="info-item">
                    <span class="info-label">Sexo</span>
                    <span class="info-value">${solicitacao.sexo === 'M' ? 'Masculino' : solicitacao.sexo === 'F' ? 'Feminino' : ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Data de Nascimento</span>
                    <span class="info-value">${formatDate(solicitacao.data_nascimento)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Idade</span>
                    <span class="info-value">${solicitacao.idade || ''} anos</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Data da Solicitação</span>
                    <span class="info-value">${formatDate(solicitacao.data_solicitacao)}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Seção 2: Diagnóstico Oncológico -->
    <div class="section">
        <div class="section-header">
            <div class="section-title">
                <div class="section-number">2</div>
                Diagnóstico Oncológico e Estadiamento TNM
            </div>
        </div>
        <div class="section-content">
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Classificação CID-10</span>
                    <span class="info-value">${solicitacao.diagnostico_cid || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Descrição do Diagnóstico</span>
                    <span class="info-value">${solicitacao.diagnostico_descricao || ''}</span>
                </div>
            </div>
            
            ${solicitacao.local_metastases ? `
            <div class="info-item">
                <span class="info-label">Localização de Metástases</span>
                <div class="text-area-value">${solicitacao.local_metastases}</div>
            </div>
            ` : ''}
            
            <div class="highlight-clinical">
                <div class="staging-grid">
                    <div class="info-item">
                        <span class="info-label">Tumor (T)</span>
                        <span class="info-value">${solicitacao.estagio_t || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Linfonodos (N)</span>
                        <span class="info-value">${solicitacao.estagio_n || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Metástase (M)</span>
                        <span class="info-value">${solicitacao.estagio_m || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Estágio Clínico</span>
                        <span class="info-value">${solicitacao.estagio_clinico || ''}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Seção 3: Histórico de Tratamentos -->
    <div class="section">
        <div class="section-header">
            <div class="section-title">
                <div class="section-number">3</div>
                Histórico de Tratamentos Oncológicos Prévios
            </div>
        </div>
        <div class="section-content">
            <div class="treatment-grid">
                <div class="info-item">
                    <span class="info-label">Cirurgia/Radioterapia</span>
                    <div class="text-area-value">${solicitacao.tratamento_cirurgia_radio || 'Não realizado'}</div>
                </div>
                <div class="info-item">
                    <span class="info-label">Quimioterapia Adjuvante</span>
                    <div class="text-area-value">${solicitacao.tratamento_quimio_adjuvante || 'Não realizado'}</div>
                </div>
                <div class="info-item">
                    <span class="info-label">Quimioterapia 1ª Linha</span>
                    <div class="text-area-value">${solicitacao.tratamento_quimio_primeira_linha || 'Não realizado'}</div>
                </div>
                <div class="info-item">
                    <span class="info-label">Quimioterapia ≥2ª Linha</span>
                    <div class="text-area-value">${solicitacao.tratamento_quimio_segunda_linha || 'Não realizado'}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Seção 4: Protocolo Terapêutico -->
    <div class="section">
        <div class="section-header">
            <div class="section-title">
                <div class="section-number">4</div>
                Protocolo Quimioterápico Proposto
            </div>
        </div>
        <div class="section-content">
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Finalidade Terapêutica</span>
                    <span class="info-value">${solicitacao.finalidade || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Performance Status (ECOG)</span>
                    <span class="info-value">${solicitacao.performance_status || ''}</span>
                </div>
            </div>
            
            <div class="info-grid-4">
                <div class="info-item">
                    <span class="info-label">Protocolo/Sigla</span>
                    <span class="info-value">${solicitacao.siglas || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Ciclos Previstos</span>
                    <span class="info-value">${solicitacao.ciclos_previstos || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Ciclo Atual</span>
                    <span class="info-value">${solicitacao.ciclo_atual || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Superfície Corporal</span>
                    <span class="info-value">${solicitacao.superficie_corporal || ''} m²</span>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Peso Corporal</span>
                    <span class="info-value">${solicitacao.peso || ''} kg</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Altura</span>
                    <span class="info-value">${solicitacao.altura || ''} cm</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Seção 5: Prescrição Médica -->
    <div class="section">
        <div class="section-header">
            <div class="section-title">
                <div class="section-number">5</div>
                Prescrição de Agentes Antineoplásicos
            </div>
        </div>
        <div class="section-content">
            <div class="medication-section">
                <div class="medication-title">Medicamentos Antineoplásicos Prescritos</div>
                
                ${solicitacao.protocolo_medicamentos_json ? `
                <!-- Medicamentos do Protocolo Selecionado -->
                <div class="info-item" style="margin-bottom: 8px;">
                    <span class="info-label">Protocolo: ${solicitacao.protocolo_nome || ''}</span>
                    <div class="text-area-value">${formatMedicamentosProtocolo(solicitacao.protocolo_medicamentos_json)}</div>
                </div>
                ` : `
                <!-- Medicamentos Manuais -->
                <div class="info-item" style="margin-bottom: 8px;">
                    <div class="text-area-value">${formatMedicamentosManuais(solicitacao.medicamentos_antineoplasticos)}</div>
                </div>
                `}
                
                <div class="info-grid-3">
                    <div class="info-item">
                        <span class="info-label">Dosagem por m²</span>
                        <span class="info-value">${solicitacao.dose_por_m2 || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Dose Total Calculada</span>
                        <span class="info-value">${solicitacao.dose_total || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Via de Administração</span>
                        <span class="info-value">${solicitacao.via_administracao || ''}</span>
                    </div>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Esquema Posológico (Dias e Intervalos)</span>
                    <span class="info-value">${solicitacao.dias_aplicacao_intervalo || ''}</span>
                </div>
            </div>
        </div>
    </div>

    ${solicitacao.medicacoes_associadas ? `
    <!-- Seção 6: Medicações Coadjuvantes -->
    <div class="section">
        <div class="section-header">
            <div class="section-title">
                <div class="section-number">6</div>
                Medicações Coadjuvantes e Suporte
            </div>
        </div>
        <div class="section-content">
            <div class="text-area-value">${solicitacao.medicacoes_associadas}</div>
        </div>
    </div>
    ` : ''}

    ${solicitacao.observacoes ? `
    <!-- Observações Clínicas -->
    <div class="section">
        <div class="section-header">
            <div class="section-title">
                <div class="section-number">📝</div>
                Observações Clínicas Adicionais
            </div>
        </div>
        <div class="section-content">
            <div class="text-area-value">${solicitacao.observacoes}</div>
        </div>
    </div>
    ` : ''}

    <!-- Seção de Responsabilidade Médica -->
    <div class="signature-section">
        <div class="signature-title">Responsabilidade Médica e Autorização</div>
        
        <div class="signature-grid">
            <div>
                <div class="info-item">
                    <span class="info-label">Médico Oncologista Responsável</span>
                    <span class="info-value">${solicitacao.medico_assinatura_crm || ''}</span>
                </div>
                <div class="signature-box">
                    <div class="signature-label">Assinatura e Carimbo do Médico Responsável</div>
                </div>
            </div>
            
            <div>
                <div class="info-item">
                    <span class="info-label">Número da Autorização</span>
                    <div class="authorization-box ${solicitacao.status === 'aprovada' ? 'authorization-approved' : ''}">
                        ${solicitacao.numero_autorizacao || 'Aguardando processamento'}
                    </div>
                </div>
                
                ${solicitacao.status === 'aprovada' ? `
                <div class="clinical-note">
                    ✓ AUTORIZAÇÃO MÉDICA APROVADA<br>
                    <small>Documento válido para execução do protocolo prescrito</small>
                </div>
                ` : ''}
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

// Função principal para gerar o PDF
export const generateAuthorizationPDF = async (solicitacao: SolicitacaoAutorizacao, clinicLogo?: string): Promise<Buffer> => {
    let browser;
    try {
        // Inicializar o Puppeteer com configurações otimizadas
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--memory-pressure-off',
            '--max_old_space_size=4096'
          ]
        });

        const page = await browser.newPage();

        // Configurar viewport otimizado
        await page.setViewport({
          width: 1200,
          height: 1600,
          deviceScaleFactor: 1.5 // Reduzido de 2 para 1.5 para melhor performance
        });

        // Desabilitar recursos desnecessários para melhorar performance
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
            req.abort();
          } else {
            req.continue();
          }
        });

        // Gerar o conteúdo HTML
        const htmlContent = generateHTMLTemplate(solicitacao);

        // Carregar o HTML na página com timeout otimizado
        await page.setContent(htmlContent, { 
          waitUntil: ['domcontentloaded'], // Removido 'networkidle0' para melhor performance
          timeout: 15000 // Reduzido de 30s para 15s
        });

        // Aguardar fontes carregarem com timeout
        await Promise.race([
          page.evaluateHandle('document.fonts.ready'),
          new Promise(resolve => setTimeout(resolve, 1000)) // Timeout de 1s para fontes
        ]);

        // Aguardar um pouco para garantir que o layout está completo (reduzido)
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100))); // Reduzido de 200ms para 100ms

        // Gerar templates do header e footer nativos
        const headerTemplate = generateHeaderTemplate(solicitacao, clinicLogo);
        const footerTemplate = generateFooterTemplate();

        // Gerar PDF com configurações otimizadas para performance
        const pdfUint8Array = await page.pdf({
          format: 'A4',
          margin: {
            top: '132px',     // Espaço para o header nativo
            right: '0mm',     // Margem zero para footer ocupar largura total
            bottom: '80px',   // Espaço para o footer nativo
            left: '0mm'       // Margem zero para footer ocupar largura total
          },
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: true,        // Header e footer nativos ativados
          headerTemplate: headerTemplate,   // Header em todas as páginas
          footerTemplate: footerTemplate,   // Footer configurado para ocupar largura total
          timeout: 30000, // Reduzido de 60s para 30s
          scale: 1,
          omitBackground: false,
        });

        // Converter Uint8Array para Buffer
        const pdfBuffer = Buffer.from(pdfUint8Array);

        return pdfBuffer;
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      throw new Error(`Erro ao gerar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
};