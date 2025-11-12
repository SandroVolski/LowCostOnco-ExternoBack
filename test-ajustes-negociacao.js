// Teste das funcionalidades de Ajustes de Negociação
const API_BASE_URL = 'http://localhost:3001/api';

async function testarAjustesNegociacao() {
    try {
        const novaSolicitacao = {
            clinica_id: 1,
            tipo: 'negociacao',
            titulo: 'Revisão de Protocolo XYZ',
            descricao: 'Solicitação de ajuste no protocolo XYZ devido a novas diretrizes clínicas',
            prioridade: 'alta',
            categoria: 'protocolo'
        };

        const createResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaSolicitacao)
        });

        if (!createResponse.ok) {
            throw new Error(`Erro ao criar: ${createResponse.status} ${createResponse.statusText}`);
        }

        const created = await createResponse.json();
        const solicitacaoId = created.data.id;

        const listResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes?clinica_id=1&tipo=negociacao&page=1&pageSize=10`);

        if (!listResponse.ok) {
            throw new Error(`Erro ao listar: ${listResponse.status} ${listResponse.statusText}`);
        }

        const listData = await listResponse.json();
        const getResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes/${solicitacaoId}`);

        if (!getResponse.ok) {
            throw new Error(`Erro ao obter: ${getResponse.status} ${getResponse.statusText}`);
        }

        const solicitacao = await getResponse.json();
        const statusResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes/${solicitacaoId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'em_analise',
                comentario: 'Em análise pela operadora'
            })
        });

        if (!statusResponse.ok) {
            throw new Error(`Erro ao alterar status: ${statusResponse.status} ${statusResponse.statusText}`);
        }

        const updateResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes/${solicitacaoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prioridade: 'critica',
                descricao: 'Descrição atualizada - prioridade elevada para crítica'
            })
        });

        if (!updateResponse.ok) {
            throw new Error(`Erro ao atualizar: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        const statsResponse = await fetch(`${API_BASE_URL}/ajustes/estatisticas/negociacao?clinica_id=1`);

        if (!statsResponse.ok) {
            throw new Error(`Erro ao obter estatísticas: ${statsResponse.status} ${statsResponse.statusText}`);
        }

        const stats = await statsResponse.json();
        const filterResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes?clinica_id=1&tipo=negociacao&prioridade=critica&categoria=protocolo`);

        if (!filterResponse.ok) {
            throw new Error(`Erro ao filtrar: ${filterResponse.status} ${filterResponse.statusText}`);
        }

        const filterData = await filterResponse.json();
        const sortResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes?clinica_id=1&tipo=negociacao&sort=prioridade:asc`);

        if (!sortResponse.ok) {
            throw new Error(`Erro ao ordenar: ${sortResponse.status} ${sortResponse.statusText}`);
        }

        const deleteResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes/${solicitacaoId}`, {
            method: 'DELETE'
        });

        if (!deleteResponse.ok) {
            console.warn('⚠️ Não foi possível excluir solicitação de teste');
        } else {}
    } catch (error) {
        console.error('❌ Erro nos testes:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Response:', await error.response.text());
        }
    }
}

// Executar testes
testarAjustesNegociacao(); 