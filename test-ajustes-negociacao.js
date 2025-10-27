// Teste das funcionalidades de Ajustes de Negociação
const API_BASE_URL = 'http://localhost:3001/api';

async function testarAjustesNegociacao() {
    console.log('🧪 Testando Ajustes de Negociação...\n');

    try {
        // 1. Criar solicitação de negociação
        console.log('1. Criando solicitação de negociação...');
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
        console.log('✅ Solicitação criada:', created.data.id);
        const solicitacaoId = created.data.id;

        // 2. Listar solicitações de negociação
        console.log('\n2. Listando solicitações de negociação...');
        const listResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes?clinica_id=1&tipo=negociacao&page=1&pageSize=10`);
        
        if (!listResponse.ok) {
            throw new Error(`Erro ao listar: ${listResponse.status} ${listResponse.statusText}`);
        }

        const listData = await listResponse.json();
        console.log(`✅ Listadas ${listData.data.items.length} solicitações de negociação`);

        // 3. Obter solicitação específica
        console.log('\n3. Obtendo solicitação específica...');
        const getResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes/${solicitacaoId}`);
        
        if (!getResponse.ok) {
            throw new Error(`Erro ao obter: ${getResponse.status} ${getResponse.statusText}`);
        }

        const solicitacao = await getResponse.json();
        console.log('✅ Solicitação obtida:', solicitacao.data.titulo);

        // 4. Alterar status
        console.log('\n4. Alterando status para "em_analise"...');
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

        console.log('✅ Status alterado com sucesso');

        // 5. Atualizar solicitação
        console.log('\n5. Atualizando solicitação...');
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

        console.log('✅ Solicitação atualizada com sucesso');

        // 6. Obter estatísticas
        console.log('\n6. Obtendo estatísticas de negociação...');
        const statsResponse = await fetch(`${API_BASE_URL}/ajustes/estatisticas/negociacao?clinica_id=1`);
        
        if (!statsResponse.ok) {
            throw new Error(`Erro ao obter estatísticas: ${statsResponse.status} ${statsResponse.statusText}`);
        }

        const stats = await statsResponse.json();
        console.log('✅ Estatísticas obtidas:');
        console.log(`   - Total: ${stats.data.totalSolicitacoes}`);
        console.log(`   - Críticas: ${stats.data.solicitacoesCriticas}`);
        console.log(`   - Taxa de aprovação: ${stats.data.taxaAprovacao}%`);

        // 7. Testar filtros
        console.log('\n7. Testando filtros...');
        const filterResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes?clinica_id=1&tipo=negociacao&prioridade=critica&categoria=protocolo`);
        
        if (!filterResponse.ok) {
            throw new Error(`Erro ao filtrar: ${filterResponse.status} ${filterResponse.statusText}`);
        }

        const filterData = await filterResponse.json();
        console.log(`✅ Filtros aplicados: ${filterData.data.items.length} solicitações encontradas`);

        // 8. Testar ordenação
        console.log('\n8. Testando ordenação por prioridade...');
        const sortResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes?clinica_id=1&tipo=negociacao&sort=prioridade:asc`);
        
        if (!sortResponse.ok) {
            throw new Error(`Erro ao ordenar: ${sortResponse.status} ${sortResponse.statusText}`);
        }

        console.log('✅ Ordenação aplicada com sucesso');

        // 9. Limpeza - excluir solicitação de teste
        console.log('\n9. Limpando dados de teste...');
        const deleteResponse = await fetch(`${API_BASE_URL}/ajustes/solicitacoes/${solicitacaoId}`, {
            method: 'DELETE'
        });

        if (!deleteResponse.ok) {
            console.warn('⚠️ Não foi possível excluir solicitação de teste');
        } else {
            console.log('✅ Solicitação de teste excluída');
        }

        console.log('\n🎉 Todos os testes de Ajustes de Negociação passaram!');

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