// test-multiple-contacts.js - Teste da funcionalidade de múltiplos telefones e emails

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testMultipleContacts() {
  console.log('🧪 Testando funcionalidade de múltiplos telefones e emails...\n');

  try {
    // Teste 1: Buscar perfil atual da clínica
    console.log('1️⃣ Buscando perfil atual da clínica...');
    const response1 = await axios.get(`${BASE_URL}/clinicas/profile`);
    
    if (response1.data.success) {
      const clinica = response1.data.data.clinica;
      console.log('✅ Perfil encontrado:', {
        nome: clinica.nome,
        telefones: clinica.telefones,
        emails: clinica.emails
      });
      
      // Teste 2: Atualizar com múltiplos telefones e emails
      console.log('\n2️⃣ Atualizando com múltiplos telefones e emails...');
      
      const updateData = {
        clinica: {
          ...clinica,
          telefones: ['(11) 99999-9999', '(11) 88888-8888', '(11) 77777-7777'],
          emails: ['contato@clinica.com', 'admin@clinica.com', 'suporte@clinica.com']
        }
      };
      
      const response2 = await axios.put(`${BASE_URL}/clinicas/profile`, updateData);
      
      if (response2.data.success) {
        console.log('✅ Perfil atualizado com sucesso!');
        console.log('📋 Novos dados:', {
          telefones: response2.data.data.clinica.telefones,
          emails: response2.data.data.clinica.emails
        });
      } else {
        console.log('❌ Erro ao atualizar:', response2.data.message);
      }
      
      // Teste 3: Verificar se os dados foram salvos corretamente
      console.log('\n3️⃣ Verificando se os dados foram salvos...');
      const response3 = await axios.get(`${BASE_URL}/clinicas/profile`);
      
      if (response3.data.success) {
        const clinicaAtualizada = response3.data.data.clinica;
        console.log('✅ Dados confirmados:', {
          telefones: clinicaAtualizada.telefones,
          emails: clinicaAtualizada.emails
        });
        
        // Verificar se os arrays estão corretos
        if (Array.isArray(clinicaAtualizada.telefones) && Array.isArray(clinicaAtualizada.emails)) {
          console.log('✅ Arrays de telefones e emails estão corretos!');
          console.log(`📞 ${clinicaAtualizada.telefones.length} telefones cadastrados`);
          console.log(`📧 ${clinicaAtualizada.emails.length} emails cadastrados`);
        } else {
          console.log('❌ Arrays não estão no formato esperado');
        }
      }
      
      // Teste 4: Testar com arrays vazios
      console.log('\n4️⃣ Testando com arrays vazios...');
      const updateDataEmpty = {
        clinica: {
          ...clinica,
          telefones: [''],
          emails: ['']
        }
      };
      
      const response4 = await axios.put(`${BASE_URL}/clinicas/profile`, updateDataEmpty);
      
      if (response4.data.success) {
        console.log('✅ Arrays vazios salvos corretamente');
      }
      
    } else {
      console.log('❌ Erro ao buscar perfil:', response1.data.message);
    }

    console.log('\n🎉 Todos os testes concluídos!');

  } catch (error) {
    console.error('❌ Erro nos testes:', error.response?.data || error.message);
    
    if (error.response?.status === 500) {
      console.log('\n💡 Possíveis causas:');
      console.log('   - Colunas telefones/emails não foram criadas no banco');
      console.log('   - Execute o script database-add-multiple-contacts.sql');
      console.log('   - Verifique se o servidor está rodando');
    }
  }
}

// Executar testes
testMultipleContacts(); 