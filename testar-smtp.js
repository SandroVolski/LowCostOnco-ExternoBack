const nodemailer = require('nodemailer');
require('dotenv').config();

async function testarSMTP() {
  console.log('🧪 Testando configuração SMTP...\n');
  
  // Verificar variáveis de ambiente
  console.log('📋 Variáveis de ambiente:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST || 'NÃO DEFINIDO');
  console.log('  SMTP_PORT:', process.env.SMTP_PORT || 'NÃO DEFINIDO');
  console.log('  SMTP_USER:', process.env.SMTP_USER || 'NÃO DEFINIDO');
  console.log('  SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***DEFINIDO***' : 'NÃO DEFINIDO');
  console.log('  SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL || 'NÃO DEFINIDO');
  console.log('');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ SMTP_USER ou SMTP_PASSWORD não estão configurados no .env');
    return;
  }

  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
    }
  };

  try {
    console.log('🔧 Criando transportador SMTP...');
    const transporter = nodemailer.createTransport(smtpConfig);
    
    console.log('✅ Transportador criado!');
    console.log('🔍 Verificando conexão...');
    
    // Verificar conexão
    await transporter.verify();
    console.log('✅ Conexão SMTP verificada com sucesso!\n');
    
    // Tentar enviar email de teste
    console.log('📧 Enviando email de teste...');
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'Sistema Onkhos';
    
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: 'sandroeduardopradovolski@gmail.com',
      subject: 'Teste de Email - Sistema Onkhos',
      html: `
        <h2>Email de Teste</h2>
        <p>Se você recebeu este email, a configuração SMTP está funcionando!</p>
        <p>Enviado de: ${fromEmail}</p>
        <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
      `,
      text: 'Se você recebeu este email, a configuração SMTP está funcionando!'
    });
    
    console.log('✅ Email de teste enviado com sucesso!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📧 Para:', info.accepted);
    console.log('\n⚠️ Verifique sua caixa de entrada (e spam) em alguns segundos!');
    
  } catch (error) {
    console.error('❌ Erro ao testar SMTP:');
    console.error('  Tipo:', error.name);
    console.error('  Mensagem:', error.message);
    
    if (error.code) {
      console.error('  Código:', error.code);
    }
    
    if (error.response) {
      console.error('  Resposta do servidor:', error.response);
    }
    
    console.error('\n💡 Possíveis soluções:');
    console.error('  1. Verifique se as credenciais estão corretas');
    console.error('  2. Verifique se a porta 587 não está bloqueada');
    console.error('  3. Teste fazer login no webmail da Hostinger com as mesmas credenciais');
    console.error('  4. Verifique se o email noreply@onkho.com.br está ativo na Hostinger');
  }
}

testarSMTP();

