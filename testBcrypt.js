// testBcrypt.js - Script para testar se o bcrypt funciona corretamente
// Execute: node testBcrypt.js

const bcrypt = require('bcryptjs');

async function testarBcrypt() {
  console.log('='.repeat(60));
  console.log('🔧 TESTE DE BCRYPT - VERIFICAÇÃO DE HASH');
  console.log('='.repeat(60));
  
  // Dados do teste
  const senhaOriginal = 'LowCostC2025';
  const hashArmazenado = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  console.log('📝 Senha original:', senhaOriginal);
  console.log('📝 Hash armazenado:', hashArmazenado);
  console.log('-'.repeat(60));
  
  try {
    // Teste 1: Verificar se o hash conhecido funciona
    console.log('🔧 Teste 1: Verificando hash conhecido...');
    const teste1 = await bcrypt.compare(senhaOriginal, hashArmazenado);
    console.log('✅ Resultado Teste 1:', teste1 ? 'SUCESSO' : 'FALHA');
    
    if (!teste1) {
      console.log('❌ PROBLEMA: Hash conhecido não confere!');
      return;
    }
    
    // Teste 2: Gerar novo hash e comparar
    console.log('\n🔧 Teste 2: Gerando novo hash...');
    const novoHash = await bcrypt.hash(senhaOriginal, 10);
    console.log('📝 Novo hash gerado:', novoHash);
    
    const teste2 = await bcrypt.compare(senhaOriginal, novoHash);
    console.log('✅ Resultado Teste 2:', teste2 ? 'SUCESSO' : 'FALHA');
    
    // Teste 3: Testar senha incorreta
    console.log('\n🔧 Teste 3: Testando senha incorreta...');
    const teste3 = await bcrypt.compare('senha_errada', hashArmazenado);
    console.log('✅ Resultado Teste 3 (deve ser false):', teste3 ? 'FALHA' : 'SUCESSO');
    
    // Teste 4: Verificar diferentes formatos
    console.log('\n🔧 Teste 4: Testando variações da senha...');
    const variacoes = [
      'LowCostC2025',
      'lowcostc2025',
      'LOWCOSTC2025',
      ' LowCostC2025',
      'LowCostC2025 '
    ];
    
    for (const variacao of variacoes) {
      const resultado = await bcrypt.compare(variacao, hashArmazenado);
      console.log(`   "${variacao}": ${resultado ? 'SUCESSO' : 'FALHA'}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNÓSTICO:');
    
    if (teste1 && teste2 && !teste3) {
      console.log('✅ BCRYPT FUNCIONANDO PERFEITAMENTE!');
      console.log('✅ O problema não é no hash/bcrypt.');
      console.log('✅ Verifique se:');
      console.log('   - JWT_SECRET está configurado no .env');
      console.log('   - Rota de login não tem middleware de auth');
      console.log('   - Controller está sendo chamado');
    } else {
      console.log('❌ PROBLEMA COM BCRYPT DETECTADO!');
      console.log('❌ Verifique a instalação: npm install bcryptjs');
    }
    
    console.log('='.repeat(60));
    
    // Bonus: Gerar hash para outras senhas
    console.log('\n🔑 BONUS: Hashes para outras senhas do sistema:');
    const senhasExtras = ['LowCostO2025', 'LowCostPS2025'];
    
    for (const senha of senhasExtras) {
      const hash = await bcrypt.hash(senha, 10);
      console.log(`${senha}: ${hash}`);
    }
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    console.log('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.log('1. npm install bcryptjs');
    console.log('2. Verificar versão do Node.js');
    console.log('3. Limpar node_modules e reinstalar');
  }
}

// Executar teste
testarBcrypt();

// Função adicional para testar hash do banco
async function testarHashDoBanco() {
  console.log('\n\n' + '='.repeat(60));
  console.log('🗄️  TESTE COM DADOS DO BANCO');
  console.log('='.repeat(60));
  
  // Simular dados que vêm do banco
  const dadosDoBanco = {
    id: 1,
    nome: 'Clínica Oncológica São Paulo',
    usuario: 'LCOClínica',
    senha: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    status: 'ativo'
  };
  
  const senhaDigitada = 'LowCostC2025';
  
  console.log('🔧 Simulando login com dados do banco...');
  console.log('📝 Usuário:', dadosDoBanco.usuario);
  console.log('📝 Status:', dadosDoBanco.status);
  console.log('📝 Tem senha?', !!dadosDoBanco.senha);
  console.log('📝 Tamanho da senha:', dadosDoBanco.senha.length);
  
  try {
    const senhaConfere = await bcrypt.compare(senhaDigitada, dadosDoBanco.senha);
    console.log('\n✅ Senha confere:', senhaConfere ? 'SIM' : 'NÃO');
    
    if (senhaConfere && dadosDoBanco.status === 'ativo') {
      console.log('🎉 LOGIN SERIA BEM-SUCEDIDO!');
    } else {
      console.log('❌ LOGIN FALHARIA');
      if (!senhaConfere) console.log('   Motivo: Senha incorreta');
      if (dadosDoBanco.status !== 'ativo') console.log('   Motivo: Status inativo');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar senha:', error);
  }
}

// Executar teste do banco após 2 segundos
setTimeout(testarHashDoBanco, 2000);