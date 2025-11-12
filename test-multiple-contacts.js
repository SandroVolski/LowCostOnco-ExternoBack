// test-multiple-contacts.js - Teste da funcionalidade de múltiplos telefones e emails

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testMultipleContacts() {
  try {
    const response1 = await axios.get(`${BASE_URL}/clinicas/profile`);

    if (response1.data.success) {
      const clinica = response1.data.data.clinica;

      const updateData = {
        clinica: {
          ...clinica,
          telefones: ['(11) 99999-9999', '(11) 88888-8888', '(11) 77777-7777'],
          emails: ['contato@clinica.com', 'admin@clinica.com', 'suporte@clinica.com']
        }
      };

      const response2 = await axios.put(`${BASE_URL}/clinicas/profile`, updateData);

      if (response2.data.success) {} else {}

      const response3 = await axios.get(`${BASE_URL}/clinicas/profile`);

      if (response3.data.success) {
        const clinicaAtualizada = response3.data.data.clinica;

        // Verificar se os arrays estão corretos
        if (Array.isArray(clinicaAtualizada.telefones) && Array.isArray(clinicaAtualizada.emails)) {} else {}
      }

      const updateDataEmpty = {
        clinica: {
          ...clinica,
          telefones: [''],
          emails: ['']
        }
      };

      const response4 = await axios.put(`${BASE_URL}/clinicas/profile`, updateDataEmpty);

      if (response4.data.success) {}
    } else {}
  } catch (error) {
    console.error('❌ Erro nos testes:', error.response?.data || error.message);
    
    if (error.response?.status === 500) {}
  }
}

// Executar testes
testMultipleContacts(); 