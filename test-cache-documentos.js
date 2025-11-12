// Usar fetch nativo do Node.js 18+
const API_BASE = 'http://localhost:3001/api';

async function testCacheDocumentos() {
    try {
        const start1 = Date.now();
        const response1 = await fetch(`${API_BASE}/clinicas/documentos?clinica_id=1`);
        const data1 = await response1.json();
        const time1 = Date.now() - start1;

        const start2 = Date.now();
        const response2 = await fetch(`${API_BASE}/clinicas/documentos?clinica_id=1`);
        const data2 = await response2.json();
        const time2 = Date.now() - start2;

        const etag = response1.headers.get('etag');
        const start3 = Date.now();
        const response3 = await fetch(`${API_BASE}/clinicas/documentos?clinica_id=1`, {
            headers: {
                'If-None-Match': etag
            }
        });
        const time3 = Date.now() - start3;

        // Teste 4: Verificar se cache está funcionando
        if (time2 < time1 * 0.8) {} else {}
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Executar teste
testCacheDocumentos(); 