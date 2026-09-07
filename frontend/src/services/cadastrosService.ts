// Mock temporario ate a API Express expor os endpoints de listagem
import type { IArea, IDepartamento } from '../types/cadastros';

export const cadastrosService = {
  async getAreas(): Promise<IArea[]> {
    return [
      { id: '1', descricao: 'Administrativo', descricao_curta: 'Responsavel pelo suporte a gestao da empresa, incluindo financas, RH, compras, marketing e rotinas administrativas.', status: 'Ativo' },
      { id: '2', descricao: 'Logistica', descricao_curta: 'Responsavel pelo recebimento, armazenamento, movimentacao e expedicao de materiais e produtos.', status: 'Ativo' },
      { id: '3', descricao: 'Obra', descricao_curta: 'Responsavel pela execucao de servicos de construcao, manutencao e infra-estrutura.', status: 'Ativo' },
      { id: '4', descricao: 'Producao', descricao_curta: 'Responsavel pela fabricacao, montagem, acabamento, embalagem e controle operacional dos produtos.', status: 'Ativo' },
    ];
  },

  async getDepartamentos(): Promise<IDepartamento[]> {
    return [
      { id: '1', descricao: 'Administrativo', descricao_curta: 'Responsavel pela gestao administrativa da empresa.', status: 'Ativo' },
      { id: '2', descricao: 'Almoxarifado', descricao_curta: 'Responsavel pelo recebimento, armazenamento, controle e distribuicao de materiais.', status: 'Ativo' },
      { id: '3', descricao: 'Comercial', descricao_curta: 'Responsavel pela prospeccao, atendimento e relacionamento com clientes.', status: 'Ativo' },
      { id: '4', descricao: 'Compras', descricao_curta: 'Responsavel pela aquisicao de materiais, produtos e servicos.', status: 'Ativo' },
      { id: '5', descricao: 'Expedicao', descricao_curta: 'Responsavel pela separacao, conferencia e envio de produtos.', status: 'Ativo' },
      { id: '6', descricao: 'Financeiro', descricao_curta: 'Responsavel pelo controle financeiro, contas a pagar e receber.', status: 'Ativo' },
      { id: '7', descricao: 'Logistica', descricao_curta: 'Responsavel pelo planejamento e controle do transporte e armazenamento.', status: 'Ativo' },
      { id: '8', descricao: 'Manutencao', descricao_curta: 'Responsavel pela conservacao, reparo e funcionamento de equipamentos.', status: 'Ativo' },
      { id: '9', descricao: 'Marketing', descricao_curta: 'Responsavel pela divulgacao da marca e acoes de marketing.', status: 'Ativo' },
      { id: '10', descricao: 'Obra', descricao_curta: 'Responsavel pela execucao e acompanhamento de obras.', status: 'Ativo' },
      { id: '11', descricao: 'PCP', descricao_curta: 'Planejamento e Controle da Producao.', status: 'Ativo' },
      { id: '12', descricao: 'Producao', descricao_curta: 'Responsavel pela fabricacao e processos produtivos.', status: 'Ativo' },
      { id: '13', descricao: 'Qualidade', descricao_curta: 'Responsavel pelo monitoramento de qualidade.', status: 'Ativo' },
      { id: '14', descricao: 'RH', descricao_curta: 'Responsavel pela gestao de pessoas.', status: 'Ativo' },
      { id: '15', descricao: 'Servicos Gerais', descricao_curta: 'Responsavel pela limpeza e conservacao.', status: 'Ativo' },
      { id: '16', descricao: 'TI', descricao_curta: 'Responsavel pela gestao de tecnologia.', status: 'Ativo' },
    ];
  },
};
