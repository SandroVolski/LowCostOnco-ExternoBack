// test-pdf-protocolo.js
const fs = require('fs');
const path = require('path');

// ✅ FUNÇÃO DE TESTE: Formatar medicamentos manuais
const formatMedicamentosManuais = (medicamentosString) => {
  if (!medicamentosString || medicamentosString.trim() === '') return '';
  
  try {
    // Separar por ; e limpar espaços em branco
    const medicamentos = medicamentosString
      .split(';')
      .map(med => med.trim())
      .filter(med => med.length > 0);
    
    if (medicamentos.length === 0) return '';
    
    // Retornar cada medicamento em uma linha separada
    return medicamentos.join('\n');
    
  } catch (error) {
    console.warn('⚠️  Erro ao formatar medicamentos manuais:', error);
    return medicamentosString || '';
  }
};

const medicamentosTeste = "Teste 01 100mg VO D1,D7,D12,D15,D21,D25,D28,D30,D32,D69 2x; Teste 01 200mg IM D8-D20 3x";

// Simular dados de uma solicitação com protocolo
const solicitacaoComProtocolo = {
  id: 123,
  clinica_id: 1,
  paciente_id: 8,
  hospital_nome: "Clínica Oncológica Irati PR",
  hospital_codigo: "COSP002",
  cliente_nome: "Pacientes Sistema 01",
  cliente_codigo: "PAC0001",
  sexo: "M",
  data_nascimento: "1980-11-25",
  idade: 44,
  data_solicitacao: "2025-07-28",
  diagnostico_cid: "C25, C30, C32",
  diagnostico_descricao: "Protocolo de Teste 0001",
  local_metastases: "pele",
  estagio_t: "2",
  estagio_n: "3",
  estagio_m: "4",
  estagio_clinico: "2",
  tratamento_cirurgia_radio: "Cirurgia",
  tratamento_quimio_adjuvante: "Cirurgia",
  tratamento_quimio_primeira_linha: "Cirurgia",
  tratamento_quimio_segunda_linha: "Cirurgia",
  finalidade: "curativo",
  performance_status: "BOA",
  siglas: "Protocolo Sistema 01",
  ciclos_previstos: 3,
  ciclo_atual: 2,
  superficie_corporal: 5,
  peso: 100,
  altura: 180,
  medicamentos_antineoplasticos: "Teste 01 100mg/m² VO D1,D7,D12,D15,D21,D25,D28,D30,D32,D69 2x; Teste 01 200mg/kg IM D8-D20 3x",
  dose_por_m2: "2",
  dose_total: "3",
  via_administracao: "5",
  dias_aplicacao_intervalo: "4",
  medicacoes_associadas: "teste 1\nteste 2\nteste 3",
  medico_assinatura_crm: "25112003",
  numero_autorizacao: "",
  status: "pendente",
  observacoes: "",
  // Dados do Protocolo
  protocolo_id: 2,
  protocolo_nome: "Protocolo Sistema 01",
  protocolo_descricao: "Protocolo de Teste 0001",
  protocolo_cid: "C25, C30, C32",
  protocolo_intervalo_ciclos: 21,
  protocolo_linha: 1,
  protocolo_medicamentos_json: JSON.stringify([
    {
      id: 3,
      protocolo_id: 2,
      nome: "Teste 01",
      dose: "100",
      unidade_medida: "mg/m2",
      via_adm: "VO",
      dias_adm: "D1,D7,D12,D15,D21,D25,D28,D30,D32,D69",
      frequencia: "2x",
      observacoes: null,
      ordem: 1,
      created_at: "2025-07-28T20:20:17.000Z",
      updated_at: "2025-07-28T20:20:17.000Z"
    },
    {
      id: 4,
      protocolo_id: 2,
      nome: "Teste 01",
      dose: "200",
      unidade_medida: "mg/m2",
      via_adm: "IM",
      dias_adm: "D8-D20",
      frequencia: "3x",
      observacoes: null,
      ordem: 2,
      created_at: "2025-07-28T20:20:17.000Z",
      updated_at: "2025-07-28T20:20:17.000Z"
    }
  ])
};

// Simular dados de uma solicitação sem protocolo (método antigo)
const solicitacaoSemProtocolo = {
  id: 124,
  clinica_id: 1,
  paciente_id: 8,
  hospital_nome: "Clínica Oncológica Irati PR",
  hospital_codigo: "COSP002",
  cliente_nome: "Pacientes Sistema 01",
  cliente_codigo: "PAC0001",
  sexo: "M",
  data_nascimento: "1980-11-25",
  idade: 44,
  data_solicitacao: "2025-07-28",
  diagnostico_cid: "C25, C30, C32",
  diagnostico_descricao: "Diagnóstico Manual",
  local_metastases: "pele",
  estagio_t: "2",
  estagio_n: "3",
  estagio_m: "4",
  estagio_clinico: "2",
  tratamento_cirurgia_radio: "Cirurgia",
  tratamento_quimio_adjuvante: "Cirurgia",
  tratamento_quimio_primeira_linha: "Cirurgia",
  tratamento_quimio_segunda_linha: "Cirurgia",
  finalidade: "curativo",
  performance_status: "BOA",
  siglas: "Protocolo Manual",
  ciclos_previstos: 3,
  ciclo_atual: 2,
  superficie_corporal: 5,
  peso: 100,
  altura: 180,
  medicamentos_antineoplasticos: "Teste 01 100mg/m² VO D1,D7,D12,D15,D21,D25,D28,D30,D32,D69 2x; Teste 01 200mg/kg IM D8-D20 3x",
  dose_por_m2: "2",
  dose_total: "3",
  via_administracao: "5",
  dias_aplicacao_intervalo: "4",
  medicacoes_associadas: "teste 1\nteste 2\nteste 3",
  medico_assinatura_crm: "25112003",
  numero_autorizacao: "",
  status: "pendente",
  observacoes: ""
};

async function testPDFGeneration() {
  try {
    // Importar a função de geração de PDF
    const { generateAuthorizationPDF } = require('./src/utils/pdfGenerator.ts');

    const pdfBufferComProtocolo = await generateAuthorizationPDF(solicitacaoComProtocolo);

    // Salvar PDF com protocolo
    const outputPathComProtocolo = path.join(__dirname, 'test-pdf-com-protocolo.pdf');
    fs.writeFileSync(outputPathComProtocolo, pdfBufferComProtocolo);
    const pdfBufferSemProtocolo = await generateAuthorizationPDF(solicitacaoSemProtocolo);

    // Salvar PDF sem protocolo
    const outputPathSemProtocolo = path.join(__dirname, 'test-pdf-sem-protocolo.pdf');
    fs.writeFileSync(outputPathSemProtocolo, pdfBufferSemProtocolo);
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testPDFGeneration(); 