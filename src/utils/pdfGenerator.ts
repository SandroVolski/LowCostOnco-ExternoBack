// src/utils/pdfGenerator.ts - VERSÃO PROFISSIONAL CORRIGIDA

import puppeteer from 'puppeteer';
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

// Template HTML profissional para o PDF médico
const generateProfessionalHTMLTemplate = (solicitacao: SolicitacaoAutorizacao, clinicLogo?: string): string => {
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
        
        body {
            font-family: 'Source Sans Pro', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #2c3e50;
            background: white;
            margin: 0;
            padding: 0;
        }
        
        .page-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            overflow: hidden;
        }
        
        /* Header profissional e sóbrio */
        .professional-header {
            background: #f8f9fa;
            border-bottom: 3px solid #2c3e50;
            padding: 20px 30px;
            position: relative;
        }
        
        .header-border {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%);
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            z-index: 2;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .clinic-logo {
            width: 50px;
            height: 50px;
            border-radius: 4px;
            background: white;
            padding: 6px;
            border: 2px solid #dee2e6;
            object-fit: contain;
        }
        
        .logo-placeholder {
            width: 50px;
            height: 50px;
            border-radius: 4px;
            background: white;
            border: 2px solid #dee2e6;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: #2c3e50;
            font-weight: 600;
        }
        
        .header-text {
            flex: 1;
            text-align: center;
        }
        
        .header-title {
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .header-subtitle {
            font-size: 12px;
            font-weight: 400;
            margin: 3px 0 0 0;
            color: #6c757d;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
        }
        
        .status-section {
            text-align: right;
        }
        
        .request-number {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #2c3e50;
            font-family: 'Courier New', monospace;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid;
        }
        
        .status-pendente { 
            background: #fff3cd; 
            color: #856404; 
            border-color: #ffeaa7;
        }
        .status-aprovada { 
            background: #d4edda; 
            color: #155724; 
            border-color: #c3e6cb;
        }
        .status-rejeitada { 
            background: #f8d7da; 
            color: #721c24; 
            border-color: #f5c6cb;
        }
        .status-em_analise { 
            background: #d1ecf1; 
            color: #0c5460; 
            border-color: #bee5eb;
        }
        
        /* Content area profissional */
        .content {
            padding: 25px 30px;
        }
        
        .section {
            margin-bottom: 20px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            overflow: hidden;
            page-break-inside: avoid;
        }
        
        .section-header {
            background: #f8f9fa;
            padding: 12px 18px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .section-title {
            font-size: 12px;
            font-weight: 700;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .section-number {
            background: #2c3e50;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
        }
        
        .section-content {
            padding: 18px;
            background: white;
        }
        
        /* Grid layouts médicos */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .info-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 12px;
        }
        
        .info-grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
        }
        
        .staging-grid {
            display: grid;
            grid-template-columns: 70px 70px 70px 1fr;
            gap: 8px;
            margin-bottom: 12px;
            padding: 12px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 3px;
        }
        
        .treatment-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 12px;
        }
        
        .info-item {
            margin-bottom: 8px;
        }
        
        .info-label {
            font-weight: 600;
            color: #495057;
            display: block;
            margin-bottom: 3px;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .info-value {
            background: white;
            border: 1px solid #ced4da;
            border-radius: 2px;
            padding: 6px 8px;
            display: block;
            min-height: 18px;
            font-weight: 400;
            color: #212529;
            font-size: 10px;
        }
        
        .info-value:not(:empty) {
            background: #fdfdfd;
            border-color: #adb5bd;
        }
        
        .full-width {
            grid-column: 1 / -1;
        }
        
        /* Seção de medicamentos profissional */
        .medication-section {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 3px;
            padding: 15px;
            margin: 12px 0;
        }
        
        .medication-title {
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Seção de assinatura profissional */
        .signature-section {
            background: white;
            border: 2px solid #2c3e50;
            border-radius: 4px;
            padding: 20px;
            margin-top: 25px;
        }
        
        .signature-title {
            font-size: 12px;
            font-weight: 700;
            color: #2c3e50;
            text-transform: uppercase;
            margin-bottom: 15px;
            text-align: center;
            letter-spacing: 0.5px;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 25px;
            align-items: start;
        }
        
        .signature-box {
            border: 1px solid #6c757d;
            border-radius: 2px;
            padding: 30px 15px;
            text-align: center;
            margin-top: 10px;
            background: white;
        }
        
        .signature-label {
            font-size: 9px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 8px;
        }
        
        .authorization-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 3px;
            padding: 15px;
            text-align: center;
        }
        
        .authorization-approved {
            background: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
        }
        
        /* Footer profissional */
        .professional-footer {
            background: #2c3e50;
            color: white;
            padding: 15px 30px;
            margin-top: 25px;
            font-size: 9px;
        }
        
        .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            align-items: center;
            text-align: center;
        }
        
        .footer-section h4 {
            font-size: 10px;
            font-weight: 600;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .footer-section p {
            opacity: 0.8;
            line-height: 1.3;
        }
        
        /* Texto em áreas */
        .text-area-value {
            background: white;
            border: 1px solid #ced4da;
            border-radius: 2px;
            padding: 8px;
            min-height: 50px;
            white-space: pre-wrap;
            font-size: 10px;
            line-height: 1.3;
        }
        
        .highlight-clinical {
            background: #e9ecef;
            border-left: 3px solid #2c3e50;
            border-radius: 0 2px 2px 0;
            padding: 12px;
            margin: 8px 0;
        }
        
        .clinical-note {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 3px;
            padding: 10px;
            margin: 8px 0;
            font-size: 10px;
            color: #856404;
        }
        
        /* Melhorias para impressão */
        @media print {
            body { 
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .page-container {
                max-width: none;
            }
            
            .section {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .professional-header {
                page-break-after: avoid;
            }
        }
        
        /* Tabelas médicas */
        .medical-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 10px;
        }
        
        .medical-table th,
        .medical-table td {
            border: 1px solid #dee2e6;
            padding: 6px 8px;
            text-align: left;
        }
        
        .medical-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.3px;
        }
    </style>
</head>
<body>
    <div class="page-container">
        <!-- Header Profissional -->
        <div class="professional-header">
            <div class="header-content">
                <div class="logo-section">
                    ${clinicLogo 
                        ? `<img src="${clinicLogo}" alt="Logo da Clínica" class="clinic-logo" />`
                        : `<div class="logo-placeholder">⚕️</div>`
                    }
                </div>
                
                <div class="header-text">
                    <h1 class="header-title">Autorização de Tratamento Oncológico</h1>
                    <p class="header-subtitle">Solicitação de Processamento - Quimioterapia Antineoplásica</p>
                </div>
                
                <div class="status-section">
                    <div class="request-number">SOL-${String(solicitacao.id || 'NOVA').padStart(6, '0')}</div>
                    <div class="status-badge status-${solicitacao.status || 'pendente'}">
                        ${formatStatus(solicitacao.status || 'pendente')}
                    </div>
                </div>
            </div>
            <div class="header-border"></div>
        </div>

        <div class="content">
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
                        <div class="info-item" style="margin-bottom: 15px;">
                            <div class="text-area-value">${solicitacao.medicamentos_antineoplasticos || ''}</div>
                        </div>
                        
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

            <!-- Seção 7: Responsabilidade Médica -->
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
        </div>

        <!-- Footer Profissional -->
        <div class="professional-footer">
            <div class="footer-grid">
                <div class="footer-section">
                    <h4>Sistema de Gestão</h4>
                    <p>Low Cost Onco<br>Oncologia Clínica</p>
                </div>
                <div class="footer-section">
                    <h4>Documento Gerado</h4>
                    <p>${formatDate(new Date().toISOString())} - ${new Date().toLocaleTimeString('pt-BR')}<br>Documento Oficial</p>
                </div>
                <div class="footer-section">
                    <h4>Validade Médica</h4>
                    <p>Conforme Resolução CFM<br>e Normas ANVISA</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

// Função principal para gerar o PDF profissional
export const generateAuthorizationPDF = async (solicitacao: SolicitacaoAutorizacao, clinicLogo?: string): Promise<Buffer> => {
  console.log('🏥 Gerando PDF profissional para solicitação oncológica:', solicitacao.id);
  
  let browser;
  try {
    // Inicializar o Puppeteer com configurações otimizadas para documentos médicos
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configurar viewport para qualidade profissional
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2
    });
    
    // Gerar o HTML profissional
    const htmlContent = generateProfessionalHTMLTemplate(solicitacao, clinicLogo);
    
    // Carregar o HTML na página
    await page.setContent(htmlContent, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });
    
    // Aguardar fontes carregarem
    await page.evaluateHandle('document.fonts.ready');
    
    // Gerar o PDF com configurações para documento médico
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      timeout: 60000
    });
    
    // Converter Uint8Array para Buffer
    const pdfBuffer = Buffer.from(pdfUint8Array);
    
    console.log('✅ PDF médico profissional gerado! Tamanho:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF médico:', error);
    throw new Error(`Erro ao gerar documento médico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};