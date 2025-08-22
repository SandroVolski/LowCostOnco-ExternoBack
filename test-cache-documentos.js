// Usar fetch nativo do Node.js 18+
const API_BASE = 'http://localhost:3001/api';

async function testCacheDocumentos() {
    console.log('🧪 Testando cache de documentos...\n');

    try {
        // Teste 1: Primeira requisição (deve ir ao banco)
        console.log('📥 Teste 1: Primeira requisição (deve ir ao banco)');
        const start1 = Date.now();
        const response1 = await fetch(`${API_BASE}/clinicas/documentos?clinica_id=1`);
        const data1 = await response1.json();
        const time1 = Date.now() - start1;
        
        console.log(`   Status: ${response1.status}`);
        console.log(`   Tempo: ${time1}ms`);
        console.log(`   Documentos: ${data1.data?.documentos?.length || 0}`);
        console.log(`   Cache-Control: ${response1.headers.get('cache-control')}`);
        console.log(`   ETag: ${response1.headers.get('etag')}`);
        console.log('');

        // Teste 2: Segunda requisição (deve usar cache)
        console.log('📥 Teste 2: Segunda requisição (deve usar cache)');
        const start2 = Date.now();
        const response2 = await fetch(`${API_BASE}/clinicas/documentos?clinica_id=1`);
        const data2 = await response2.json();
        const time2 = Date.now() - start2;
        
        console.log(`   Status: ${response2.status}`);
        console.log(`   Tempo: ${time2}ms`);
        console.log(`   Documentos: ${data2.data?.documentos?.length || 0}`);
        console.log(`   Cache-Control: ${response2.headers.get('cache-control')}`);
        console.log(`   ETag: ${response2.headers.get('etag')}`);
        console.log('');

        // Teste 3: Requisição com ETag (deve retornar 304 se cache válido)
        console.log('📥 Teste 3: Requisição com ETag (deve retornar 304 se cache válido)');
        const etag = response1.headers.get('etag');
        const start3 = Date.now();
        const response3 = await fetch(`${API_BASE}/clinicas/documentos?clinica_id=1`, {
            headers: {
                'If-None-Match': etag
            }
        });
        const time3 = Date.now() - start3;
        
        console.log(`   Status: ${response3.status}`);
        console.log(`   Tempo: ${time3}ms`);
        console.log(`   Cache-Control: ${response3.headers.get('cache-control')}`);
        console.log(`   ETag: ${response3.headers.get('etag')}`);
        console.log('');

        // Teste 4: Verificar se cache está funcionando
        if (time2 < time1 * 0.8) {
            console.log('✅ Cache está funcionando! Segunda requisição foi mais rápida.');
        } else {
            console.log('⚠️ Cache pode não estar funcionando. Segunda requisição não foi significativamente mais rápida.');
        }

        // Teste 5: Verificar headers de cache
        console.log('\n🔍 Headers de cache:');
        console.log(`   Cache-Control: ${response1.headers.get('cache-control')}`);
        console.log(`   ETag: ${response1.headers.get('etag')}`);
        console.log(`   Vary: ${response1.headers.get('vary')}`);

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Executar teste
testCacheDocumentos(); 