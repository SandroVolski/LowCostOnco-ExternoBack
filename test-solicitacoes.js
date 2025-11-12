// Teste das funcionalidades de solicitações
// Execute com: node test-solicitacoes.js

const baseUrl = 'http://localhost:3001';

async function testSolicitacoes() {
  // 1. Health Check
  try {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
  } catch (error) {
    return;
  }

  // 2. Teste de Banco
  try {
    const response = await fetch(`${baseUrl}/api/test-db`);
    const data = await response.json();
  } catch (error) {}

  // 3. Criar solicitação de teste
  try {
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
      const searchResponse = await fetch(`${baseUrl}/api/solicitacoes/${result.data.id}`);
      const searchResult = await searchResponse.json();

      if (searchResult.success) {} else {}

      try {
        const pdfResponse = await fetch(`${baseUrl}/api/solicitacoes/${result.data.id}/pdf`);
        
        if (pdfResponse.ok) {
          const contentType = pdfResponse.headers.get('content-type');
          const contentLength = pdfResponse.headers.get('content-length');

          // Salvar PDF para verificação (opcional)
          const pdfBuffer = await pdfResponse.arrayBuffer();
          const fs = require('fs');
          fs.writeFileSync(`solicitacao_${result.data.id}_teste.pdf`, Buffer.from(pdfBuffer));
        } else {
          const errorText = await pdfResponse.text();
        }
      } catch (pdfError) {}

      const listResponse = await fetch(`${baseUrl}/api/solicitacoes?page=1&limit=5`);
      const listResult = await listResponse.json();

      if (listResult.success) {} else {}

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

      if (updateResult.success) {} else {}
    } else {}
  } catch (error) {}
}

testSolicitacoes().catch(console.error);