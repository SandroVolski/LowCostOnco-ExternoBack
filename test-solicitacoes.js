// Teste das funcionalidades de solicitações
// Execute com: node test-solicitacoes.js

const baseUrl = 'http://localhost:3001';

async function testSolicitacoes() {
  console.log('🔧 Testando funcionalidades de solicitações...\n');

  // 1. Health Check
  try {
    console.log('1. Testando Health Check...');
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    console.log('✅ Health Check:', data.success ? 'OK' : 'Erro');
  } catch (error) {
    console.log('❌ Erro no Health Check:', error.message);
    return;
  }

  // 2. Teste de Banco
  try {
    console.log('\n2. Testando conexão com banco...');
    const response = await fetch(`${baseUrl}/api/test-db`);
    const data = await response.json();
    console.log(data.success ? '✅ Banco OK' : '❌ Problema no banco');
  } catch (error) {
    console.log('❌ Erro no teste de banco:', error.message);
  }

  // 3. Criar solicitação de teste
  try {
    console.log('\n3. Criando solicitação de teste...');
    const solicitacaoTeste = {
      clinica_id: 1,
      hospital_nome: "Hospital Teste",
      hospital_codigo: "HT001",
      cliente_nome: "João da Silva",
      cliente_codigo: "JS001",
      sexo: "M",
      data_nascimento: "1980-05-15",
      idade: 44,
      data_solicitacao: "2024-06-02",
      diagnostico_cid: "C78",
      diagnostico_descricao: "Câncer de pulmão",
      estagio_t: "T2",
      estagio_n: "N1",
      estagio_m: "M0",
      estagio_clinico: "IIB",
      finalidade: "curativo",
      performance_status: "0",
      ciclos_previstos: 6,
      ciclo_atual: 1,
      superficie_corporal: 1.8,
      peso: 75.5,
      altura: 175,
      medicamentos_antineoplasticos: "Cisplatina 75mg/m² + Etoposídeo 100mg/m²",
      dose_por_m2: "Cisplatina 75mg/m², Etoposídeo 100mg/m²",
      dose_total: "Cisplatina 135mg, Etoposídeo 180mg",
      via_administracao: "Endovenosa",
      dias_aplicacao_intervalo: "D1 a D3, repetir a cada 21 dias",
      medico_assinatura_crm: "Dr. João Oncologista - CRM 12345"
    };

    const response = await fetch(`${baseUrl}/api/solicitacoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(solicitacaoTeste),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Solicitação criada com sucesso!');
      console.log(`ID da solicitação: ${result.data.id}`);
      
      // 4. Testar busca da solicitação
      console.log('\n4. Testando busca da solicitação...');
      const searchResponse = await fetch(`${baseUrl}/api/solicitacoes/${result.data.id}`);
      const searchResult = await searchResponse.json();
      
      if (searchResult.success) {
        console.log('✅ Solicitação encontrada:', searchResult.data.cliente_nome);
      } else {
        console.log('❌ Erro ao buscar solicitação:', searchResult.message);
      }

      // 5. Testar geração de PDF
      console.log('\n5. Testando geração de PDF...');
      try {
        const pdfResponse = await fetch(`${baseUrl}/api/solicitacoes/${result.data.id}/pdf`);
        
        if (pdfResponse.ok) {
          const contentType = pdfResponse.headers.get('content-type');
          const contentLength = pdfResponse.headers.get('content-length');
          
          console.log('✅ PDF gerado com sucesso!');
          console.log(`Content-Type: ${contentType}`);
          console.log(`Tamanho: ${contentLength} bytes`);
          
          // Salvar PDF para verificação (opcional)
          const pdfBuffer = await pdfResponse.arrayBuffer();
          const fs = require('fs');
          fs.writeFileSync(`solicitacao_${result.data.id}_teste.pdf`, Buffer.from(pdfBuffer));
          console.log(`📄 PDF salvo como: solicitacao_${result.data.id}_teste.pdf`);
          
        } else {
          console.log('❌ Erro ao gerar PDF:', pdfResponse.status, pdfResponse.statusText);
          const errorText = await pdfResponse.text();
          console.log('Detalhes do erro:', errorText);
        }
      } catch (pdfError) {
        console.log('❌ Erro na geração de PDF:', pdfError.message);
      }

      // 6. Testar listagem de solicitações
      console.log('\n6. Testando listagem de solicitações...');
      const listResponse = await fetch(`${baseUrl}/api/solicitacoes?page=1&limit=5`);
      const listResult = await listResponse.json();
      
      if (listResult.success) {
        console.log(`✅ Listagem funcionando: ${listResult.data.data.length} solicitações encontradas`);
        console.log(`Total: ${listResult.data.pagination.total}`);
      } else {
        console.log('❌ Erro na listagem:', listResult.message);
      }

      // 7. Testar atualização de status
      console.log('\n7. Testando atualização de status...');
      const updateResponse = await fetch(`${baseUrl}/api/solicitacoes/${result.data.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'aprovada',
          numero_autorizacao: 'AUTH2024001',
          observacoes: 'Solicitação aprovada para teste'
        }),
      });

      const updateResult = await updateResponse.json();
      
      if (updateResult.success) {
        console.log('✅ Status atualizado com sucesso!');
        console.log(`Novo status: ${updateResult.data.status}`);
        console.log(`Número de autorização: ${updateResult.data.numero_autorizacao}`);
      } else {
        console.log('❌ Erro ao atualizar status:', updateResult.message);
      }

    } else {
      console.log('❌ Erro ao criar solicitação:', result.message);
    }
    
  } catch (error) {
    console.log('❌ Erro no teste de solicitação:', error.message);
  }

  console.log('\n✨ Teste concluído!');
  console.log('\n📋 Resumo dos testes:');
  console.log('- Health Check');
  console.log('- Conexão com banco');
  console.log('- Criação de solicitação');
  console.log('- Busca de solicitação');
  console.log('- Geração de PDF');
  console.log('- Listagem de solicitações');
  console.log('- Atualização de status');
}

testSolicitacoes().catch(console.error);