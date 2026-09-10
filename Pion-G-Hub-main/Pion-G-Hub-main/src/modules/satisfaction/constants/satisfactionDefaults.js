export const QUESTION_TYPES = [
  { value: 'short_text', label: 'Resposta curta' },
  { value: 'long_text', label: 'Texto longo' },
  { value: 'rating_1_5', label: 'Avaliação de 1 a 5' },
  { value: 'nps_0_10', label: 'Escala de 0 a 10 (NPS)' },
  { value: 'single_choice', label: 'Escolha única' },
]

export function formatQuestionType(tipo) {
  return QUESTION_TYPES.find((t) => t.value === tipo)?.label || tipo
}

// metric_key das perguntas de identificação: usado pelo formulário público
// pra também preencher as colunas respondente_* (além de aparecerem como
// perguntas comuns, dinâmicas e editáveis como qualquer outra).
export const RESPONDENT_METRIC_KEYS = {
  NOME: 'respondent_name',
  EMPRESA: 'respondent_company',
  CARGO: 'respondent_role',
  TELEFONE: 'respondent_phone',
  EMAIL: 'respondent_email',
}

// Modelo padrão Pion G Plus — usado ao criar uma pesquisa com "usar modelo padrão".
// `ordem` é atribuída pelo service ao inserir (posição no array), não precisa
// vir aqui.
export const DEFAULT_TEMPLATE_QUESTIONS = [
  { titulo: 'Nome completo', tipo: 'short_text', obrigatoria: true, metric_key: RESPONDENT_METRIC_KEYS.NOME },
  { titulo: 'Empresa', tipo: 'short_text', obrigatoria: false, metric_key: RESPONDENT_METRIC_KEYS.EMPRESA },
  { titulo: 'Cargo', tipo: 'short_text', obrigatoria: false, metric_key: RESPONDENT_METRIC_KEYS.CARGO },
  { titulo: 'Telefone', tipo: 'short_text', obrigatoria: false, metric_key: RESPONDENT_METRIC_KEYS.TELEFONE },
  { titulo: 'E-mail', tipo: 'short_text', obrigatoria: true, metric_key: RESPONDENT_METRIC_KEYS.EMAIL },
  { titulo: 'Como você avalia sua experiência geral em nosso estande?', tipo: 'rating_1_5', obrigatoria: true },
  { titulo: 'Como você avalia a recepção da nossa equipe?', tipo: 'rating_1_5', obrigatoria: true },
  { titulo: 'Como você avalia a simpatia e atendimento da equipe?', tipo: 'rating_1_5', obrigatoria: true },
  { titulo: 'As informações recebidas foram claras e objetivas?', tipo: 'rating_1_5', obrigatoria: true },
  { titulo: 'Como você avalia a estrutura e organização do estande?', tipo: 'rating_1_5', obrigatoria: true },
  { titulo: 'Como você avalia a dinâmica/atividade realizada em nosso estande?', tipo: 'rating_1_5', obrigatoria: true },
  {
    titulo: 'A dinâmica tornou sua visita mais interessante?',
    tipo: 'single_choice',
    obrigatoria: true,
    opcoes: ['Sim', 'Parcialmente', 'Não'],
  },
  {
    titulo: 'Como você avalia o tempo de atendimento?',
    tipo: 'single_choice',
    obrigatoria: true,
    opcoes: ['Excelente', 'Adequado', 'Poderia ser mais rápido'],
  },
  {
    titulo: 'O que você mais gostou em nosso estande e o que podemos melhorar para os próximos eventos?',
    tipo: 'long_text',
    obrigatoria: false,
  },
  {
    titulo: 'Em uma escala de 0 a 10, qual a probabilidade de você recomendar a Pion G Plus a outro profissional?',
    tipo: 'nps_0_10',
    obrigatoria: true,
  },
]

export function classifySatisfaction(mediaRating) {
  if (mediaRating == null) return 'Sem dados'
  if (mediaRating >= 4.5) return 'Excelente'
  if (mediaRating >= 4.0) return 'Muito bom'
  if (mediaRating >= 3.0) return 'Regular'
  return 'Precisa melhorar'
}
