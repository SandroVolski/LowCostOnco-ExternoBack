import { parseStringPromise } from 'xml2js';

export interface TISSParsedData {
  cabecalho: {
    tipoTransacao: string;
    sequencialTransacao: string;
    dataRegistroTransacao: string;
    horaRegistroTransacao: string;
    cnpjPrestador: string;
    registroANS: string;
    padrao: string;
    nomePrestador: string;
    cnes: string;
    hash: string;
  };
  lote: {
    numeroLote: string;
    competencia?: string;
    data_envio?: string;
    valor_total?: number;
  };
  operadora: {
    registro_ans: string;
    nome: string;
  };
  versao_tiss: string;
  hash_xml: string;
  guias: TISSGuia[];
}

export interface TISSGuia {
  cabecalhoGuia: {
    registroANS: string;
    numeroGuiaPrestador: string;
    guiaPrincipal: string;
  };
  dadosAutorizacao?: {
    numeroGuiaOperadora: string;
    dataAutorizacao: string;
    senha: string;
    dataValidadeSenha: string;
  };
  dadosBeneficiario?: {
    numeroCarteira: string;
    atendimentoRN: string;
  };
  dadosSolicitante?: {
    cnpjContratado: string;
    nomeContratado: string;
    profissional?: {
      nomeProfissional: string;
      conselhoProfissional: string;
      numeroConselhoProfissional: string;
      uf: string;
      cbos: string;
    };
  };
  dadosSolicitacao?: {
    dataSolicitacao: string;
    caraterAtendimento: string;
    indicacaoClinica: string;
  };
  dadosExecutante?: {
    cnpjContratado: string;
    cnes: string;
  };
  dadosAtendimento?: {
    tipoAtendimento: string;
    indicacaoAcidente: string;
    regimeAtendimento: string;
  };
  procedimentosExecutados?: TISSProcedimento[];
  outrasDespesas?: TISSDespesa[];
  valorTotal: {
    valorProcedimentos?: number;
    valorTaxasAlugueis?: number;
    valorMateriais?: number;
    valorMedicamentos?: number;
    valorGases?: number;
    valorTotalGeral: number;
  };
  // Campos adicionais para o banco de dados
  numero_guia_prestador: string;
  numero_guia_operadora: string;
  numero_carteira: string;
  data_autorizacao: string;
  data_execucao: string;
  data_solicitacao: string;
  senha: string;
  data_validade_senha: string;
  indicacao_clinica: string;
  tipo_atendimento: string;
  carater_atendimento: string;
  regime_atendimento: string;
  cnpj_prestador: string;
  cnes: string;
  profissional_solicitante?: {
    nome: string;
    conselho: string;
    numero_conselho: string;
    uf: string;
    cbos: string;
    cpf: string;
  };
  procedimentos: any[];
  medicamentos: any[];
  materiais: any[];
  taxas: any[];
  valor_procedimentos: number;
  valor_medicamentos: number;
  valor_materiais: number;
  valor_taxas: number;
  valor_total: number;
}

export interface TISSProcedimento {
  sequencialItem: number;
  dataExecucao: string;
  horaInicial: string;
  horaFinal: string;
  procedimento: {
    codigoTabela: string;
    codigoProcedimento: string;
    descricaoProcedimento: string;
  };
  quantidadeExecutada: number;
  viaAcesso?: string;
  reducaoAcrescimo: number;
  valorUnitario: number;
  valorTotal: number;
  unidadeMedida?: string;
  equipeSadt?: {
    grauPart: string;
    cpfContratado?: string;
    nomeProf: string;
    conselho: string;
    numeroConselhoProfissional: string;
    uf: string;
    cbos: string;
  };
}

export interface TISSDespesa {
  sequencialItem: number;
  codigoDespesa: string;
  servicosExecutados: {
    dataExecucao: string;
    horaInicial: string;
    horaFinal: string;
    codigoTabela: string;
    codigoProcedimento: string;
    quantidadeExecutada: number;
    unidadeMedida: string;
    reducaoAcrescimo: number;
    valorUnitario: number;
    valorTotal: number;
    descricaoProcedimento: string;
  };
}

export class TISSParser {
  /**
   * Parse completo de arquivo XML TISS
   */
  static async parseXML(xmlContent: string): Promise<TISSParsedData> {
    try {
      console.log('🔧 Iniciando parse do XML TISS...');
      
      const result = await parseStringPromise(xmlContent, {
        explicitArray: false,
        mergeAttrs: true,
        tagNameProcessors: [this.stripPrefix],
        ignoreAttrs: false,
        explicitCharkey: false
      });

      console.log('📋 XML parseado com sucesso, estrutura:', Object.keys(result));

      const mensagem = result.mensagemTISS;
      
      if (!mensagem) {
        console.log('⚠️ mensagemTISS não encontrado! Estrutura do result:', Object.keys(result));
        throw new Error('Estrutura de XML TISS inválida');
      }

      console.log('📋 Mensagem TISS encontrada:', Object.keys(mensagem));

      const loteGuias = mensagem.prestadorParaOperadora?.loteGuias;
      console.log('📋 LoteGuias encontrado:', loteGuias);

      if (!loteGuias) {
        console.log('⚠️ loteGuias não encontrado! Estrutura do prestadorParaOperadora:', mensagem.prestadorParaOperadora);
        throw new Error('loteGuias não encontrado no XML');
      }

      // Extrair hash do epílogo
      const epilogo = mensagem.epilogo;
      const hashEpilogo = this.parseEpilogo(epilogo);
      console.log('📋 Hash do epílogo:', hashEpilogo);

      const parsedData = {
        cabecalho: this.parseCabecalho(mensagem.cabecalho, hashEpilogo),
        lote: this.parseLote(loteGuias),
        guias: this.parseGuias(loteGuias),
        operadora: this.parseOperadora(loteGuias),
        versao_tiss: this.parseVersaoTISS(mensagem),
        hash_xml: this.generateHash(xmlContent)
      };

      console.log('✅ Parse completo finalizado:', {
        cabecalho: parsedData.cabecalho,
        lote: parsedData.lote,
        operadora: parsedData.operadora,
        totalGuias: parsedData.guias.length
      });

      return parsedData;
    } catch (error: any) {
      console.error('❌ Erro ao parsear XML TISS:', error);
      throw new Error(`Erro ao parsear XML TISS: ${error.message}`);
    }
  }

  /**
   * Remove prefixos de namespace
   */
  private static stripPrefix(name: string): string {
    return name.replace(/^ans:/, '');
  }

  /**
   * Parse do cabeçalho do XML
   */
  private static parseCabecalho(cabecalho: any, hashEpilogo?: string): TISSParsedData['cabecalho'] {
    console.log('🔧 Parseando cabeçalho:', cabecalho);

    if (!cabecalho) {
      console.log('⚠️ Cabeçalho não encontrado!');
      return {
        tipoTransacao: '',
        sequencialTransacao: '',
        dataRegistroTransacao: '',
        horaRegistroTransacao: '',
        cnpjPrestador: '',
        nomePrestador: '',
        registroANS: '',
        padrao: '',
        cnes: '',
        hash: hashEpilogo || ''
      };
    }

    const identificacao = cabecalho.identificacaoTransacao;
    const origem = cabecalho.origem?.identificacaoPrestador;
    const destino = cabecalho.destino;

    const parsed = {
      tipoTransacao: identificacao?.tipoTransacao || '',
      sequencialTransacao: identificacao?.sequencialTransacao || '',
      dataRegistroTransacao: identificacao?.dataRegistroTransacao || '',
      horaRegistroTransacao: identificacao?.horaRegistroTransacao || '',
      cnpjPrestador: origem?.CNPJ || origem?.cnpj || '',
      registroANS: destino?.registroANS || '',
      padrao: cabecalho.Padrao || cabecalho.padrao || '',
      // Dados adicionais do cabeçalho
      nomePrestador: origem?.nomeContratadoSolicitante || '',
      cnes: origem?.CNES || origem?.cnes || '',
      hash: hashEpilogo || cabecalho.hash || ''  // Priorizar hash do epílogo
    };

    console.log('✅ Cabeçalho parseado:', parsed);
    return parsed;
  }

  /**
   * Parse do lote
   */
  private static parseLote(loteGuias: any): TISSParsedData['lote'] {
    console.log('🔧 Parseando lote:', loteGuias);
    
    if (!loteGuias) {
      console.log('⚠️ loteGuias não encontrado!');
      return {
        numeroLote: '',
        competencia: '',
        data_envio: '',
        valor_total: 0
      };
    }
    
    return {
      numeroLote: loteGuias.numeroLote || '',
      competencia: loteGuias.competencia || '',
      data_envio: loteGuias.dataEnvio || loteGuias.data_envio || '',
      valor_total: this.parseFloat(loteGuias.valorTotal) || 0,
    };
  }

  /**
   * Parse das guias
   */
  private static parseGuias(loteGuias: any): TISSGuia[] {
    console.log('🔧 Parseando guias do lote:', loteGuias);
    
    if (!loteGuias) {
      console.log('⚠️ loteGuias não encontrado!');
      return [];
    }
    
    // Acessar guiasTISS diretamente do loteGuias
    const guiasTISS = loteGuias.guiasTISS;
    console.log('📋 GuiasTISS encontradas:', guiasTISS);
    
    if (!guiasTISS) {
      console.log('⚠️ guiasTISS não encontrado! Estrutura do loteGuias:', JSON.stringify(loteGuias, null, 2));
      return [];
    }
    
    // Acessar as guias SP-SADT
    let guiasArray = guiasTISS['guiaSP-SADT'];
    console.log('📋 Guias SP-SADT encontradas:', guiasArray);

    // Garantir que seja um array
    if (!Array.isArray(guiasArray)) {
      if (guiasArray) {
        guiasArray = [guiasArray];
      } else {
        guiasArray = [];
      }
    }

    console.log(`📋 Total de guias encontradas: ${guiasArray.length}`);
    
    if (guiasArray.length === 0) {
      console.log('⚠️ Nenhuma guia encontrada! Estrutura do guiasTISS:', JSON.stringify(guiasTISS, null, 2));
      return [];
    }
    
    return guiasArray.map((guia: any, index: number) => {
      console.log(`🔧 Processando guia ${index + 1}:`, guia.cabecalhoGuia?.numeroGuiaPrestador);
      return this.parseGuia(guia);
    });
  }

  /**
   * Parse de uma guia individual
   */
  private static parseGuia(guia: any): TISSGuia {
    console.log('🔧 Parseando guia individual:', guia.cabecalhoGuia?.numeroGuiaPrestador);
    
    const cabecalho = guia.cabecalhoGuia;
    const autorizacao = guia.dadosAutorizacao;
    const beneficiario = guia.dadosBeneficiario;
    const solicitante = guia.dadosSolicitante;
    const solicitacao = guia.dadosSolicitacao;
    const executante = guia.dadosExecutante;
    const atendimento = guia.dadosAtendimento;
    const valorTotal = guia.valorTotal;

    console.log('📋 Dados da guia:', {
      cabecalho: cabecalho?.numeroGuiaPrestador,
      autorizacao: autorizacao?.numeroGuiaOperadora,
      beneficiario: beneficiario?.numeroCarteira,
      valorTotal: valorTotal?.valorTotalGeral
    });

    // Parse de procedimentos executados
    let procedimentos: TISSProcedimento[] = [];
    if (guia.procedimentosExecutados) {
      console.log('🔧 Processando procedimentos executados...');
      let procArray = guia.procedimentosExecutados.procedimentoExecutado;
      if (!Array.isArray(procArray)) {
        procArray = [procArray];
      }
      console.log(`📋 Encontrados ${procArray.length} procedimentos`);
      procedimentos = procArray.map((p: any) => this.parseProcedimento(p));
    }

    // Parse de outras despesas
    let despesas: TISSDespesa[] = [];
    if (guia.outrasDespesas) {
      console.log('🔧 Processando outras despesas...');
      let despArray = guia.outrasDespesas.despesa;
      if (!Array.isArray(despArray)) {
        despArray = [despArray];
      }
      console.log(`📋 Encontradas ${despArray.length} despesas`);
      despesas = despArray.map((d: any) => this.parseDespesa(d));
    }

    const guiaParsed = {
      cabecalhoGuia: {
        registroANS: cabecalho?.registroANS || '',
        numeroGuiaPrestador: cabecalho?.numeroGuiaPrestador || '',
        guiaPrincipal: cabecalho?.guiaPrincipal || '',
      },
      dadosAutorizacao: autorizacao ? {
        numeroGuiaOperadora: autorizacao.numeroGuiaOperadora || '',
        dataAutorizacao: autorizacao.dataAutorizacao || '',
        senha: autorizacao.senha || '',
        dataValidadeSenha: autorizacao.dataValidadeSenha || '',
      } : undefined,
      dadosBeneficiario: beneficiario ? {
        numeroCarteira: beneficiario.numeroCarteira || '',
        atendimentoRN: beneficiario.atendimentoRN || 'N',
      } : undefined,
      dadosSolicitante: solicitante ? {
        cnpjContratado: solicitante.contratadoSolicitante?.cnpjContratado || '',
        nomeContratado: solicitante.nomeContratadoSolicitante || '',
        profissional: solicitante.profissionalSolicitante ? {
          nomeProfissional: solicitante.profissionalSolicitante.nomeProfissional || '',
          conselhoProfissional: solicitante.profissionalSolicitante.conselhoProfissional || '',
          numeroConselhoProfissional: solicitante.profissionalSolicitante.numeroConselhoProfissional || '',
          uf: solicitante.profissionalSolicitante.UF || solicitante.profissionalSolicitante.uf || '',
          cbos: solicitante.profissionalSolicitante.CBOS || solicitante.profissionalSolicitante.cbos || '',
        } : undefined,
      } : undefined,
      dadosSolicitacao: solicitacao ? {
        dataSolicitacao: solicitacao.dataSolicitacao || '',
        caraterAtendimento: solicitacao.caraterAtendimento || '',
        indicacaoClinica: solicitacao.indicacaoClinica || '',
      } : undefined,
      dadosExecutante: executante ? {
        cnpjContratado: executante.contratadoExecutante?.cnpjContratado || '',
        cnes: executante.CNES || executante.cnes || '',
      } : undefined,
      dadosAtendimento: atendimento ? {
        tipoAtendimento: atendimento.tipoAtendimento || '',
        indicacaoAcidente: atendimento.indicacaoAcidente || '',
        regimeAtendimento: atendimento.regimeAtendimento || '',
      } : undefined,
      procedimentosExecutados: procedimentos.length > 0 ? procedimentos : undefined,
      outrasDespesas: despesas.length > 0 ? despesas : undefined,
      valorTotal: {
        valorProcedimentos: this.parseFloat(valorTotal?.valorProcedimentos),
        valorTaxasAlugueis: this.parseFloat(valorTotal?.valorTaxasAlugueis),
        valorMateriais: this.parseFloat(valorTotal?.valorMateriais),
        valorMedicamentos: this.parseFloat(valorTotal?.valorMedicamentos),
        valorGases: this.parseFloat(valorTotal?.valorGases),
        valorTotalGeral: this.parseFloat(valorTotal?.valorTotalGeral) || 0,
      },
      // Dados adicionais para o banco de dados - USANDO NOMES CORRETOS DAS TAGS XML
      numero_guia_prestador: cabecalho?.numeroGuiaPrestador || '',
      numero_guia_operadora: autorizacao?.numeroGuiaOperadora || '',
      numero_carteira: beneficiario?.numeroCarteira || '',
      data_autorizacao: autorizacao?.dataAutorizacao || '',
      data_execucao: procedimentos.length > 0 ? procedimentos[0]?.dataExecucao || '' : '',
      data_solicitacao: solicitacao?.dataSolicitacao || '',
      senha: autorizacao?.senha || '',
      data_validade_senha: autorizacao?.dataValidadeSenha || '',
      indicacao_clinica: solicitacao?.indicacaoClinica || '',
      tipo_atendimento: atendimento?.tipoAtendimento || '',
      carater_atendimento: solicitacao?.caraterAtendimento || '',
      regime_atendimento: atendimento?.regimeAtendimento || '',
      cnpj_prestador: solicitante?.contratadoSolicitante?.cnpjContratado || executante?.contratadoExecutante?.cnpjContratado || '',
      cnes: executante?.CNES || executante?.cnes || '',
      profissional_solicitante: solicitante?.profissionalSolicitante ? {
        nome: solicitante.profissionalSolicitante.nomeProfissional || '',
        conselho: solicitante.profissionalSolicitante.conselhoProfissional || '',
        numero_conselho: solicitante.profissionalSolicitante.numeroConselhoProfissional || '',
        uf: solicitante.profissionalSolicitante.UF || solicitante.profissionalSolicitante.uf || '',
        cbos: solicitante.profissionalSolicitante.CBOS || solicitante.profissionalSolicitante.cbos || '',
        cpf: solicitante.profissionalSolicitante.cpfContratado || '',
      } : undefined,
      procedimentos: procedimentos.map(p => ({
        sequencial_item: p.sequencialItem || 0,
        codigo_tabela: p.procedimento?.codigoTabela || '',
        codigo_procedimento: p.procedimento?.codigoProcedimento || '',
        descricao_procedimento: p.procedimento?.descricaoProcedimento || '',
        data_execucao: p.dataExecucao || '',
        hora_inicial: p.horaInicial || '',
        hora_final: p.horaFinal || '',
        quantidade_executada: p.quantidadeExecutada || 1,
        via_acesso: p.viaAcesso || '',
        reducao_acrescimo: p.reducaoAcrescimo || 1.0,
        valor_unitario: p.valorUnitario || 0,
        valor_total: p.valorTotal || 0,
        unidade_medida: p.unidadeMedida || '',
        equipe: p.equipeSadt ? {
          grau_participacao: p.equipeSadt.grauPart || '',
          cpf_profissional: p.equipeSadt.cpfContratado || '',
          nome_profissional: p.equipeSadt.nomeProf || '',
          conselho: p.equipeSadt.conselho || '',
          numero_conselho: p.equipeSadt.numeroConselhoProfissional || '',
          uf: p.equipeSadt.uf || '',
          cbos: p.equipeSadt.cbos || ''
        } : undefined
      })),
      medicamentos: despesas.filter(d => d.codigoDespesa === '02').map(d => ({
        sequencial_item: d.sequencialItem || 0,
        codigo_despesa: d.codigoDespesa || '',
        codigo_tabela: d.servicosExecutados?.codigoTabela || '',
        codigo_medicamento: d.servicosExecutados?.codigoProcedimento || '',
        descricao: d.servicosExecutados?.descricaoProcedimento || '',
        data_execucao: d.servicosExecutados?.dataExecucao || '',
        hora_inicial: d.servicosExecutados?.horaInicial || '',
        hora_final: d.servicosExecutados?.horaFinal || '',
        quantidade_executada: d.servicosExecutados?.quantidadeExecutada || 1,
        unidade_medida: d.servicosExecutados?.unidadeMedida || '',
        reducao_acrescimo: d.servicosExecutados?.reducaoAcrescimo || 1.0,
        valor_unitario: d.servicosExecutados?.valorUnitario || 0,
        valor_total: d.servicosExecutados?.valorTotal || 0,
      })),
      materiais: despesas.filter(d => d.codigoDespesa === '03').map(d => ({
        sequencial_item: d.sequencialItem || 0,
        codigo_despesa: d.codigoDespesa || '',
        codigo_tabela: d.servicosExecutados?.codigoTabela || '',
        codigo_material: d.servicosExecutados?.codigoProcedimento || '',
        descricao: d.servicosExecutados?.descricaoProcedimento || '',
        data_execucao: d.servicosExecutados?.dataExecucao || '',
        hora_inicial: d.servicosExecutados?.horaInicial || '',
        hora_final: d.servicosExecutados?.horaFinal || '',
        quantidade_executada: d.servicosExecutados?.quantidadeExecutada || 1,
        unidade_medida: d.servicosExecutados?.unidadeMedida || '',
        reducao_acrescimo: d.servicosExecutados?.reducaoAcrescimo || 1.0,
        valor_unitario: d.servicosExecutados?.valorUnitario || 0,
        valor_total: d.servicosExecutados?.valorTotal || 0,
      })),
      taxas: despesas.filter(d => d.codigoDespesa === '07').map(d => ({
        sequencial_item: d.sequencialItem || 0,
        codigo_despesa: d.codigoDespesa || '',
        codigo_tabela: d.servicosExecutados?.codigoTabela || '',
        codigo_taxa: d.servicosExecutados?.codigoProcedimento || '',
        descricao: d.servicosExecutados?.descricaoProcedimento || '',
        data_execucao: d.servicosExecutados?.dataExecucao || '',
        hora_inicial: d.servicosExecutados?.horaInicial || '',
        hora_final: d.servicosExecutados?.horaFinal || '',
        quantidade_executada: d.servicosExecutados?.quantidadeExecutada || 1,
        unidade_medida: d.servicosExecutados?.unidadeMedida || '',
        reducao_acrescimo: d.servicosExecutados?.reducaoAcrescimo || 1.0,
        valor_unitario: d.servicosExecutados?.valorUnitario || 0,
        valor_total: d.servicosExecutados?.valorTotal || 0,
      })),
      valor_procedimentos: this.parseFloat(valorTotal?.valorProcedimentos),
      valor_medicamentos: this.parseFloat(valorTotal?.valorMedicamentos),
      valor_materiais: this.parseFloat(valorTotal?.valorMateriais),
      valor_taxas: this.parseFloat(valorTotal?.valorTaxasAlugueis),
      valor_total: this.parseFloat(valorTotal?.valorTotalGeral) || 0,
    };

    console.log('✅ Guia parseada:', {
      numero: guiaParsed.cabecalhoGuia.numeroGuiaPrestador,
      carteira: guiaParsed.dadosBeneficiario?.numeroCarteira,
      dataAuth: guiaParsed.dadosAutorizacao?.dataAutorizacao,
      valorTotal: guiaParsed.valorTotal.valorTotalGeral,
      procedimentos: procedimentos.length,
      despesas: despesas.length
    });

    return guiaParsed;
  }

  /**
   * Parse de procedimento executado
   */
  private static parseProcedimento(procedimento: any): TISSProcedimento {
    // Suportar ambos os formatos: com <ans:procedimento> aninhado e campos diretos
    const proc = procedimento.procedimento;
    const equipe = procedimento.equipeSadt;

    // Verificar se os dados estão no elemento aninhado ou diretamente
    const codigoTabela = proc?.codigoTabela || procedimento.codigoTabela || '';
    const codigoProcedimento = proc?.codigoProcedimento || procedimento.codigoProcedimento || '';
    const descricaoProcedimento = proc?.descricaoProcedimento || procedimento.descricaoProcedimento || '';

    return {
      sequencialItem: parseInt(procedimento.sequencialItem) || 0,
      dataExecucao: procedimento.dataExecucao || '',
      horaInicial: procedimento.horaInicial || '',
      horaFinal: procedimento.horaFinal || '',
      procedimento: {
        codigoTabela: codigoTabela,
        codigoProcedimento: codigoProcedimento,
        descricaoProcedimento: descricaoProcedimento,
      },
      quantidadeExecutada: this.parseFloat(procedimento.quantidadeExecutada) || 0,
      viaAcesso: procedimento.viaAcesso,
      reducaoAcrescimo: this.parseFloat(procedimento.reducaoAcrescimo) || 1.0,
      valorUnitario: this.parseFloat(procedimento.valorUnitario) || 0,
      valorTotal: this.parseFloat(procedimento.valorTotal) || 0,
      unidadeMedida: procedimento.unidadeMedida,
      equipeSadt: equipe ? {
        grauPart: equipe.grauPart || '',
        cpfContratado: equipe.codProfissional?.cpfContratado || '',
        nomeProf: equipe.nomeProf || '',
        conselho: equipe.conselho || '',
        numeroConselhoProfissional: equipe.numeroConselhoProfissional || '',
        uf: equipe.UF || equipe.uf || '',
        cbos: equipe.CBOS || equipe.cbos || '',
      } : undefined,
    };
  }

  /**
   * Parse de despesa
   */
  private static parseDespesa(despesa: any): TISSDespesa {
    const servicos = despesa.servicosExecutados;

    return {
      sequencialItem: parseInt(despesa.sequencialItem) || 0,
      codigoDespesa: despesa.codigoDespesa || '',
      servicosExecutados: {
        dataExecucao: servicos?.dataExecucao || '',
        horaInicial: servicos?.horaInicial || '',
        horaFinal: servicos?.horaFinal || '',
        codigoTabela: servicos?.codigoTabela || '',
        codigoProcedimento: servicos?.codigoProcedimento || '',
        quantidadeExecutada: this.parseFloat(servicos?.quantidadeExecutada) || 0,
        unidadeMedida: servicos?.unidadeMedida || '',
        reducaoAcrescimo: this.parseFloat(servicos?.reducaoAcrescimo) || 1.0,
        valorUnitario: this.parseFloat(servicos?.valorUnitario) || 0,
        valorTotal: this.parseFloat(servicos?.valorTotal) || 0,
        descricaoProcedimento: servicos?.descricaoProcedimento || '',
      },
    };
  }

  /**
   * Helper para converter string para float
   */
  private static parseFloat(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Parse da operadora
   */
  private static parseOperadora(loteGuias: any): any {
    console.log('🔧 Parseando operadora:', loteGuias);
    
    if (!loteGuias) {
      console.log('⚠️ loteGuias não encontrado para operadora!');
      return {
        registro_ans: '',
        nome: ''
      };
    }
    
    const operadora = loteGuias.operadora;
    console.log('📋 Operadora encontrada:', operadora);
    
    return {
      registro_ans: operadora?.registroANS || operadora?.registro_ans || '',
      nome: operadora?.nome || '',
    };
  }

  /**
   * Parse da versão TISS
   */
  private static parseVersaoTISS(mensagem: any): string {
    return mensagem.Padrao || mensagem.padrao || '4.01.00';
  }

  /**
   * Parse do epílogo para extrair hash
   */
  private static parseEpilogo(epilogo: any): string {
    if (!epilogo) {
      console.log('⚠️ Epílogo não encontrado!');
      return '';
    }

    const hash = epilogo.hash || '';
    console.log('✅ Hash do epílogo extraído:', hash);
    return hash;
  }

  /**
   * Gerar hash do XML
   */
  private static generateHash(xmlContent: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(xmlContent).digest('hex');
  }

  /**
   * Extrair competência do XML (YYYY-MM)
   */
  static extractCompetencia(dataRegistro: string): string {
    try {
      const data = new Date(dataRegistro);
      const year = data.getFullYear();
      const month = String(data.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    } catch {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
  }
}