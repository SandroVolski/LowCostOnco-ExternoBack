// test-medicamentos-espacos-dedicados.js - Teste da nova formatação com espaços dedicados
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para criar uma solicitação de teste
const createTestSolicitacao = async () => {
  const testData = {
    clinica_id: 1,
    cliente_nome: 'Paciente Teste Espaços Dedicados',
    cliente_cpf: '123.456.789-00',
    cliente_data_nascimento: '1980-01-01',
    cliente_sexo: 'Masculino',
    cliente_telefone: '(11) 99999-9999',
    cliente_email: 'teste@teste.com',
    cid_diagnostico: 'C50.9',
    cid_diagnostico_descricao: 'Neoplasia maligna da mama, não especificada',
    protocolo_tratamento: 'Protocolo Teste Espaços Dedicados',
    
    // ✅ CORREÇÃO: Medicamentos antineoplásicos (formato com ponto e vírgula)
    medicamentos_antineoplasticos: `Teste 01 100mg/m² VO D1,D7,D12,D15,D21,D25,D28,D30,D32,D69 2x; Teste 01 200mg/kg IM D8-D20 3x; Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x`,
    
    // Medicações coadjuvantes (formato com ponto e vírgula)
    medicacoes_associadas: `Ondansetrona 8mg EV 30min antes da quimioterapia; Dexametasona 8mg EV 30min antes da quimioterapia; Metoclopramida 10mg VO 3x/dia por 3 dias`,
    
    medico_nome: 'Dr. João Silva',
    medico_crm: 'CRM 123456/SP',
    medico_assinatura_crm: 'CRM 123456/SP',
    status: 'pendente'
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/solicitacoes`, testData);
    if (response.data.success) {
      return response.data.data.id;
    }
  } catch (error) {
    console.error('Erro ao criar solicitação de teste:', error.message);
  }
  return null;
};

// Função principal de teste
async function testMedicamentosEspacosDedicados() {
  console.log('🚀 Testando correção da formatação de medicamentos com espaços dedicados...\n');
  
  try {
    // 1. Criar solicitação de teste
    console.log('1️⃣ Criando solicitação de teste...');
    const solicitacaoId = await createTestSolicitacao();
    
    if (!solicitacaoId) {
      console.log('❌ Não foi possível criar solicitação de teste');
      return;
    }
    
    console.log(`✅ Solicitação criada com ID: ${solicitacaoId}\n`);
    
    // 2. Gerar PDF
    console.log('2️⃣ Gerando PDF com correção da formatação...');
    const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ PDF gerado com sucesso!');
    console.log('📏 Tamanho do PDF:', (pdfResponse.data.length / 1024).toFixed(2), 'KB');
    
    // 3. Salvar PDF para verificação
    const fs = require('fs');
    const fileName = `teste-medicamentos-espacos-dedicados-corrigido-${solicitacaoId}.pdf`;
    fs.writeFileSync(fileName, pdfResponse.data);
    console.log('💾 PDF salvo como:', fileName);
    
    console.log('\n🔧 CORREÇÃO IMPLEMENTADA:');
    console.log('=' .repeat(60));
    console.log('✅ 1. Processamento Correto de Múltiplos Medicamentos:');
    console.log('   • Separação por ponto e vírgula (;) primeiro');
    console.log('   • Depois separação por quebras de linha');
    console.log('   • Remoção de duplicatas');
    console.log('   • Cada medicamento processado individualmente');
    
    console.log('\n✅ 2. Espaços Dedicados para Cada Medicamento:');
    console.log('   • Cada medicamento tem seu próprio espaço');
    console.log('   • Borda destacada e fundo diferenciado');
    console.log('   • Título centralizado com fundo escuro');
    console.log('   • Espaçamento adequado entre medicamentos');
    
    console.log('\n✅ 3. Campos Separados e Organizados:');
    console.log('   • Nome do Medicamento (campo dedicado)');
    console.log('   • Dose (campo dedicado)');
    console.log('   • Via de Administração (campo dedicado)');
    console.log('   • Dias de Administração (campo dedicado)');
    console.log('   • Frequência (campo dedicado)');
    
    console.log('\n✅ 4. Layout em Grid 2x2:');
    console.log('   • Campos organizados em grid');
    console.log('   • Labels claros e em maiúsculas');
    console.log('   • Campos com bordas e fundo branco');
    console.log('   • Altura mínima para consistência visual');
    
    console.log('\n📋 DADOS DE TESTE UTILIZADOS:');
    console.log('Medicamentos Antineoplásicos:');
    console.log('• Teste 01 100mg/m² VO D1,D7,D12,D15,D21,D25,D28,D30,D32,D69 2x');
    console.log('• Teste 01 200mg/kg IM D8-D20 3x');
    console.log('• Oxaliplatina 85mg/m² EV D1 único');
    console.log('• Leucovorina 400mg/m² EV D1,D2 1x');
    
    console.log('\n👀 INSTRUÇÕES PARA VERIFICAÇÃO:');
    console.log('1. Abra o arquivo PDF gerado');
    console.log('2. Navegue até a Seção 5 (Prescrição de Agentes Antineoplásicos)');
    console.log('3. Verifique se cada medicamento está em um espaço dedicado SEPARADO');
    console.log('4. Confirme que o segundo medicamento NÃO aparece no campo Frequência do primeiro');
    console.log('5. Verifique se cada medicamento tem seus próprios campos organizados');
    
    console.log('\n📊 ESPERADO NO PDF:');
    console.log('• 4 medicamentos antineoplásicos em espaços dedicados SEPARADOS');
    console.log('• Cada medicamento com 5 campos separados');
    console.log('• Layout em grid 2x2 para os campos');
    console.log('• Títulos destacados para cada medicamento');
    console.log('• Campos com bordas e fundo diferenciado');
    
    console.log('\n💡 EXEMPLO DE ESTRUTURA ESPERADA:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│                    MEDICAMENTO 1                       │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ Nome do Medicamento: │ Dose:                           │');
    console.log('│ [Teste 01]           │ [100mg/m²]                      │');
    console.log('├─────────────────────┼───────────────────────────────────┤');
    console.log('│ Via de Administração:│ Dias de Administração:          │');
    console.log('│ [VO]                 │ [D1,D7,D12,D15,D21,D25,D28,D30] │');
    console.log('├─────────────────────┼───────────────────────────────────┤');
    console.log('│ Frequência:          │                                 │');
    console.log('│ [2x]                 │                                 │');
    console.log('└─────────────────────┴───────────────────────────────────┘');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│                    MEDICAMENTO 2                       │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ Nome do Medicamento: │ Dose:                           │');
    console.log('│ [Teste 01]           │ [200mg/kg]                      │');
    console.log('├─────────────────────┼───────────────────────────────────┤');
    console.log('│ Via de Administração:│ Dias de Administração:          │');
    console.log('│ [IM]                 │ [D8-D20]                        │');
    console.log('├─────────────────────┼───────────────────────────────────┤');
    console.log('│ Frequência:          │                                 │');
    console.log('│ [3x]                 │                                 │');
    console.log('└─────────────────────┴───────────────────────────────────┘');
    
    console.log('\n🎯 PROBLEMA CORRIGIDO:');
    console.log('❌ ANTES: Segundo medicamento aparecia no campo Frequência do primeiro');
    console.log('✅ DEPOIS: Cada medicamento tem seu próprio espaço dedicado');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.log('\n💡 Certifique-se de que o servidor está rodando em http://localhost:3001');
  }
}

// Executar teste se o script for chamado diretamente
if (require.main === module) {
  testMedicamentosEspacosDedicados();
}

module.exports = { testMedicamentosEspacosDedicados }; 