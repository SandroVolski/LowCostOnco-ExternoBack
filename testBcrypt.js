// testBcrypt.js - Script para testar se o bcrypt funciona corretamente
// Execute: node testBcrypt.js

const bcrypt = require('bcryptjs');

async function testarBcrypt() {
  // Dados do teste
  const senhaOriginal = 'LowCostC2025';
  const hashArmazenado = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

  try {
    const teste1 = await bcrypt.compare(senhaOriginal, hashArmazenado);

    if (!teste1) {
      return;
    }

    const novoHash = await bcrypt.hash(senhaOriginal, 10);

    const teste2 = await bcrypt.compare(senhaOriginal, novoHash);
    const teste3 = await bcrypt.compare('senha_errada', hashArmazenado);
    const variacoes = [
      'LowCostC2025',
      'lowcostc2025',
      'LOWCOSTC2025',
      ' LowCostC2025',
      'LowCostC2025 '
    ];

    for (const variacao of variacoes) {
      const resultado = await bcrypt.compare(variacao, hashArmazenado);
    }

    if (teste1 && teste2 && !teste3) {} else {}

    const senhasExtras = ['LowCostO2025', 'LowCostPS2025'];

    for (const senha of senhasExtras) {
      const hash = await bcrypt.hash(senha, 10);
    }
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
  }
}

// Executar teste
testarBcrypt();

// Função adicional para testar hash do banco
async function testarHashDoBanco() {
  // Simular dados que vêm do banco
  const dadosDoBanco = {
    id: 1,
    nome: 'Clínica Oncológica São Paulo',
    usuario: 'LCOClínica',
    senha: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    status: 'ativo'
  };

  const senhaDigitada = 'LowCostC2025';

  try {
    const senhaConfere = await bcrypt.compare(senhaDigitada, dadosDoBanco.senha);

    if (senhaConfere && dadosDoBanco.status === 'ativo') {} else {
      !senhaConfere;
      dadosDoBanco.status !== 'ativo';
    }
  } catch (error) {
    console.error('❌ Erro ao verificar senha:', error);
  }
}

// Executar teste do banco após 2 segundos
setTimeout(testarHashDoBanco, 2000);