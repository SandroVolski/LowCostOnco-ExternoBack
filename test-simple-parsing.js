// test-simple-parsing.js - Teste simples para parsing de medicamentos
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// ✅ FUNÇÃO DE TESTE: Formatar medicamentos manuais com parsing melhorado
const formatMedicamentosManuais = (medicamentosString) => {
  if (!medicamentosString || medicamentosString.trim() === '') return '';
  
  try {
    // Separar por ; e limpar espaços em branco
    const medicamentos = medicamentosString
      .split(';')
      .map(med => med.trim())
      .filter(med => med.length > 0);
    
    if (medicamentos.length === 0) return '';
    
    // ✅ NOVA FORMATAÇÃO: Estrutura tabular para medicamentos manuais
    return medicamentos.map((med, index) => {
      // Tentar extrair informações do medicamento manual
      const partes = med.split(' ');
      
      // Padrão mais flexível para extrair informações
      let nome = '';
      let dose = '';
      let unidade = '';
      let via = '';
      let dias = '';
      let frequencia = '';
      
      if (partes.length >= 5) {
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
        return `MEDICAMENTO ${index + 1}:
• Nome: ${nome}
• Dose: ${dose}
• Via de Administração: ${via}
• Dias de Administração: ${dias}
• Frequência: ${frequencia}`;
      } else {
        // Formato simples - mostrar como está
        return `MEDICAMENTO ${index + 1}:
• Prescrição: ${med}`;
      }
    }).join('\n\n');
    
  } catch (error) {
    console.warn('⚠️  Erro ao formatar medicamentos manuais:', error);
    return medicamentosString || '';
  }
};

async function testSimpleParsing() {
  try {
    console.log('🧪 Testando parsing simples de medicamentos...\n');
    
    // Teste 1: Medicamentos com formato padrão
    const medicamentos1 = "Doxorrubicina 60mg/m² EV D1 único; Ciclofosfamida 600mg/m² EV D1 único";
    console.log('📋 Teste 1 - Medicamentos com formato padrão:');
    console.log('Original:', medicamentos1);
    console.log('Formatado:');
    console.log(formatMedicamentosManuais(medicamentos1));
    console.log('');
    
    // Teste 2: Medicamentos com formato compacto
    const medicamentos2 = "Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x";
    console.log('📋 Teste 2 - Medicamentos com formato compacto:');
    console.log('Original:', medicamentos2);
    console.log('Formatado:');
    console.log(formatMedicamentosManuais(medicamentos2));
    console.log('');
    
    console.log('✅ Testes de parsing simples concluídos!');
    
    // Agora testar no PDF
    console.log('\n📄 Testando no PDF...');
    
    const dadosSolicitacao = {
      clinica_id: 1,
      hospital_nome: 'Clínica Teste Parsing Simples',
      hospital_codigo: 'TEST005',
      cliente_nome: 'Paciente Teste Parsing Simples',
      cliente_codigo: 'PAC005',
      sexo: 'M',
      data_nascimento: '1980-01-01',
      idade: 45,
      data_solicitacao: '2025-01-29',
      diagnostico_cid: 'C25',
      diagnostico_descricao: 'Teste de parsing simples',
      finalidade: 'curativo',
      performance_status: 'BOA',
      ciclos_previstos: 3,
      ciclo_atual: 1,
      superficie_corporal: 1.8,
      peso: 70,
      altura: 170,
      // ✅ TESTE COM FORMATO PADRÃO
      medicamentos_antineoplasticos: 'Doxorrubicina 60mg/m² EV D1 único; Ciclofosfamida 600mg/m² EV D1 único',
      dose_por_m2: '60mg/m²',
      dose_total: '660mg',
      via_administracao: 'EV',
      dias_aplicacao_intervalo: 'D1 a cada 21 dias',
      medico_assinatura_crm: 'CRM 123456/SP'
    };
    
    console.log('📤 Criando solicitação de teste...');
    const createResponse = await axios.post(`${API_BASE_URL}/solicitacoes`, dadosSolicitacao);
    
    if (createResponse.data.success) {
      const solicitacaoId = createResponse.data.data.id;
      console.log('✅ Solicitação criada com ID:', solicitacaoId);
      
      // Gerar PDF
      console.log('📄 Gerando PDF...');
      const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`, {
        responseType: 'arraybuffer'
      });
      
      console.log('✅ PDF gerado com sucesso!');
      console.log('📏 Tamanho do PDF:', (pdfResponse.data.length / 1024).toFixed(2), 'KB');
      
      // Salvar PDF para verificação
      const fs = require('fs');
      const fileName = `teste-parsing-simples-${solicitacaoId}.pdf`;
      fs.writeFileSync(fileName, pdfResponse.data);
      console.log('💾 PDF salvo como:', fileName);
      console.log('👀 Abra o arquivo para verificar se os medicamentos aparecem em formato tabular estruturado');
      
    } else {
      console.log('❌ Erro ao criar solicitação:', createResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
}

// Executar teste
testSimpleParsing(); 