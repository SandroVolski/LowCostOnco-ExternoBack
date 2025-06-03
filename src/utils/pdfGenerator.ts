// src/utils/pdfGenerator.ts - VERSÃO CORRIGIDA

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

// Template HTML para o PDF
const generateHTMLTemplate = (solicitacao: SolicitacaoAutorizacao): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solicitação de Autorização - ${solicitacao.cliente_nome}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 15px;
        }
        
        .header h1 {
            color: #0066cc;
            font-size: 18px;
            margin: 0;
            font-weight: bold;
        }
        
        .header h2 {
            color: #666;
            font-size: 14px;
            margin: 5px 0 0 0;
            font-weight: normal;
        }
        
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .section-title {
            background-color: #f0f7ff;
            color: #0066cc;
            font-weight: bold;
            padding: 8px 12px;
            margin-bottom: 10px;
            border-left: 4px solid #0066cc;
            font-size: 12px;
            text-transform: uppercase;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .info-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .info-grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .info-item {
            margin-bottom: 8px;
        }
        
        .info-label {
            font-weight: bold;
            color: #555;
            display: block;
            margin-bottom: 2px;
        }
        
        .info-value {
            color: #000;
            background-color: #f9f9f9;
            padding: 4px 6px;
            border: 1px solid #ddd;
            border-radius: 3px;
            display: block;
            min-height: 16px;
        }
        
        .full-width {
            grid-column: 1 / -1;
        }
        
        .treatment-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .treatment-item textarea-like {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            padding: 6px;
            min-height: 60px;
            font-size: 10px;
        }
        
        .staging-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 2fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .medication-section {
            background-color: #fff9f0;
            padding: 12px;
            border: 1px solid #ffe0b3;
            border-radius: 5px;
            margin-bottom: 15px;
        }
        
        .signature-section {
            margin-top: 40px;
            border-top: 1px solid #ccc;
            padding-top: 20px;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 30px;
        }
        
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
            text-align: center;
            font-size: 10px;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 10px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-pendente {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .status-aprovada {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status-rejeitada {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .status-em_analise {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        @media print {
            body { 
                margin: 0; 
                padding: 15px;
            }
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>AUTORIZAÇÃO/PROCESSAMENTO DE TRATAMENTO ONCOLÓGICO</h1>
        <h2>Solicitação #${solicitacao.id || 'NOVA'}</h2>
        <div style="margin-top: 10px;">
            Status: <span class="status-badge status-${solicitacao.status}">${solicitacao.status?.toUpperCase() || 'PENDENTE'}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Informações da Clínica e do Paciente</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Hospital/Clínica Solicitante:</span>
                <span class="info-value">${solicitacao.hospital_nome || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Código Hospital/Clínica:</span>
                <span class="info-value">${solicitacao.hospital_codigo || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Nome do Cliente:</span>
                <span class="info-value">${solicitacao.cliente_nome || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Código do Cliente:</span>
                <span class="info-value">${solicitacao.cliente_codigo || ''}</span>
            </div>
        </div>
        
        <div class="info-grid-4">
            <div class="info-item">
                <span class="info-label">Sexo:</span>
                <span class="info-value">${solicitacao.sexo === 'M' ? 'Masculino' : solicitacao.sexo === 'F' ? 'Feminino' : ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Data de Nascimento:</span>
                <span class="info-value">${formatDate(solicitacao.data_nascimento)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Idade:</span>
                <span class="info-value">${solicitacao.idade || ''} anos</span>
            </div>
            <div class="info-item">
                <span class="info-label">Data da Solicitação:</span>
                <span class="info-value">${formatDate(solicitacao.data_solicitacao)}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Diagnóstico e Estadiamento</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">CID-10:</span>
                <span class="info-value">${solicitacao.diagnostico_cid || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Diagnóstico:</span>
                <span class="info-value">${solicitacao.diagnostico_descricao || ''}</span>
            </div>
        </div>
        
        <div class="info-item full-width" style="margin-bottom: 15px;">
            <span class="info-label">Local das Metástases:</span>
            <span class="info-value">${solicitacao.local_metastases || ''}</span>
        </div>
        
        <div class="staging-grid">
            <div class="info-item">
                <span class="info-label">T:</span>
                <span class="info-value">${solicitacao.estagio_t || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">N:</span>
                <span class="info-value">${solicitacao.estagio_n || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">M:</span>
                <span class="info-value">${solicitacao.estagio_m || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Estágio Clínico:</span>
                <span class="info-value">${solicitacao.estagio_clinico || ''}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Tratamentos Realizados Anteriormente</div>
        <div class="treatment-grid">
            <div class="info-item">
                <span class="info-label">Cirurgia ou Radioterapia:</span>
                <div class="info-value" style="min-height: 60px; white-space: pre-wrap;">${solicitacao.tratamento_cirurgia_radio || ''}</div>
            </div>
            <div class="info-item">
                <span class="info-label">Quimioterapia Adjuvante:</span>
                <div class="info-value" style="min-height: 60px; white-space: pre-wrap;">${solicitacao.tratamento_quimio_adjuvante || ''}</div>
            </div>
            <div class="info-item">
                <span class="info-label">Quimioterapia 1ª Linha:</span>
                <div class="info-value" style="min-height: 60px; white-space: pre-wrap;">${solicitacao.tratamento_quimio_primeira_linha || ''}</div>
            </div>
            <div class="info-item">
                <span class="info-label">Quimioterapia 2ª Linha ou Mais:</span>
                <div class="info-value" style="min-height: 60px; white-space: pre-wrap;">${solicitacao.tratamento_quimio_segunda_linha || ''}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Esquema Terapêutico</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Finalidade:</span>
                <span class="info-value">${solicitacao.finalidade || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Performance Status Atual:</span>
                <span class="info-value">${solicitacao.performance_status || ''}</span>
            </div>
        </div>
        
        <div class="info-grid-4">
            <div class="info-item">
                <span class="info-label">Siglas:</span>
                <span class="info-value">${solicitacao.siglas || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Ciclos Previstos:</span>
                <span class="info-value">${solicitacao.ciclos_previstos || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Ciclo Atual:</span>
                <span class="info-value">${solicitacao.ciclo_atual || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Superfície Corporal:</span>
                <span class="info-value">${solicitacao.superficie_corporal || ''} m²</span>
            </div>
        </div>
        
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Peso:</span>
                <span class="info-value">${solicitacao.peso || ''} kg</span>
            </div>
            <div class="info-item">
                <span class="info-label">Altura:</span>
                <span class="info-value">${solicitacao.altura || ''} cm</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Medicamentos e Dosagem</div>
        <div class="medication-section">
            <div class="info-item" style="margin-bottom: 15px;">
                <span class="info-label">Medicamentos Antineoplásticos:</span>
                <div class="info-value" style="min-height: 40px; white-space: pre-wrap;">${solicitacao.medicamentos_antineoplasticos || ''}</div>
            </div>
            
            <div class="info-grid-3">
                <div class="info-item">
                    <span class="info-label">Dose por m²:</span>
                    <span class="info-value">${solicitacao.dose_por_m2 || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Dose Total:</span>
                    <span class="info-value">${solicitacao.dose_total || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Via de Administração:</span>
                    <span class="info-value">${solicitacao.via_administracao || ''}</span>
                </div>
            </div>
            
            <div class="info-item">
                <span class="info-label">Dias de Aplicação e Intervalo:</span>
                <span class="info-value">${solicitacao.dias_aplicacao_intervalo || ''}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Medicações Associadas</div>
        <div class="info-item">
            <div class="info-value" style="min-height: 80px; white-space: pre-wrap;">${solicitacao.medicacoes_associadas || ''}</div>
        </div>
    </div>

    <div class="section signature-section">
        <div class="section-title">Autorização e Assinatura</div>
        <div class="signature-grid">
            <div class="info-item">
                <span class="info-label">Assinatura/CRM do Médico Solicitante:</span>
                <span class="info-value">${solicitacao.medico_assinatura_crm || ''}</span>
                <div class="signature-line">Assinatura do Médico</div>
            </div>
            <div class="info-item">
                <span class="info-label">Número da Autorização:</span>
                <span class="info-value">${solicitacao.numero_autorizacao || 'Aguardando autorização'}</span>
            </div>
        </div>
    </div>

    ${solicitacao.observacoes ? `
    <div class="section">
        <div class="section-title">Observações</div>
        <div class="info-item">
            <div class="info-value" style="min-height: 60px; white-space: pre-wrap;">${solicitacao.observacoes}</div>
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <p>Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        <p>Sistema de Gestão de Clínicas Oncológicas - Low Cost Onco</p>
    </div>
</body>
</html>
  `;
};

// Função principal para gerar o PDF - CORRIGIDA
export const generateAuthorizationPDF = async (solicitacao: SolicitacaoAutorizacao): Promise<Buffer> => {
  console.log('🔧 Gerando PDF para solicitação:', solicitacao.id);
  
  let browser;
  try {
    // Inicializar o Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Gerar o HTML
    const htmlContent = generateHTMLTemplate(solicitacao);
    
    // Carregar o HTML na página
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0' 
    });
    
    // Gerar o PDF
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });
    
    // ✅ CORREÇÃO: Converter Uint8Array para Buffer
    const pdfBuffer = Buffer.from(pdfUint8Array);
    
    console.log('✅ PDF gerado com sucesso');
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    throw new Error('Erro ao gerar PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};