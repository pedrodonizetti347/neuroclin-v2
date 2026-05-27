/**
 * generateTextoConclusao.js
 * Motor de geração de texto de conclusão do laudo neuropsicológico.
 * Reproduz fielmente a lógica da planilha "Protocolo_Prevent.xlsx" em JS puro.
 * Não utiliza IA. Os textos são determinísticos e baseados nas pontuações
 * inseridas pelo avaliador.
 */

const art = (sexo) => (sexo === 'MASCULINO' ? 'o' : 'a')
const ART = (sexo) => (sexo === 'MASCULINO' ? 'O' : 'A')
const clean = (str) => str.replace(/\s{2,}/g, ' ').trim()

function gerarDiscurso(p) {
  const g = art(p.sexo)
  return clean(
    `Os resultados foram obtidos a partir dos dados da avaliação neuropsicológica, observação clínica, além da anamnese realizada e questionários respondidos pel${g} paciente e pelo informante. Durante a avaliação, ${g} paciente demonstrou ser comunicativ${g}, colaborativ${g} e dispost${g} a realizar as atividades propostas. ${p.qualidadeDiscurso}`
  )
}

function gerarInteligencia(p) {
  if (!p.wasiPontuacao && !p.wasiDesempenho) return null
  const g = art(p.sexo)
  return clean(
    `No que tange às funções avaliadas, a INTELIGÊNCIA pode ser definida como a capacidade conjunta ou global do indivíduo para agir com finalidade, pensar racionalmente e lidar efetivamente com seu meio ambiente. Global pode ser caracterizado como o comportamento do indivíduo como um todo, e conjunta, por ser composta de habilidades qualitativamente diferenciáveis, mas não inteiramente independentes, sendo então multifacetada e multideterminada. A estimativa do desempenho intelectual d${g} paciente foi medida pelo teste WASI, através do QI estimado. ${p.nome} apresentou um QI Total-2 estimado de ${p.wasiPontuacao}, percentil ${p.wasiPercentil}, o que corresponde a uma classificação de desempenho ${p.wasiDesempenho}.`
  )
}

function gerarOrientacao(p) {
  const g = art(p.sexo)
  const introBase = 'Na ORIENTAÇÃO TÊMPORO-ESPACIAL, é avaliada a capacidade de se orientar nos aspectos'

  if (p.orientacaoTemporal === p.orientacaoEspacial) {
    return clean(
      `${introBase}: noção de data e/ou espaço. Em outras palavras, a Orientação Espacial (OE) é a habilidade que o sujeito tem de localizar-se e orientar-se em relação às coisas, pessoas e até mesmo ao seu próprio corpo em uma determinada área. A Orientação Temporal (OT) é a capacidade de perceber a noção de tempo. No teste em que foi avaliada estas áreas, ${g} paciente obteve desempenho ${p.orientacaoTemporal} em ambas as funções.`
    )
  } else {
    return clean(
      `${introBase} de: noção de data e/ou espaço. Em outras palavras, a Orientação Espacial (OE) é a habilidade que o sujeito tem de localizar-se e orientar-se em relação às coisas, pessoas e até mesmo ao seu próprio corpo em uma determinada área e a Orientação Temporal (OT) é a capacidade de perceber a noção de tempo. No teste no qual foi avaliada estas áreas, ${g} paciente obteve desempenho ${p.orientacaoEspacial} na área de OE e ${p.orientacaoTemporal} na OT.`
    )
  }
}

function gerarAtencao(p) {
  const g = art(p.sexo)
  const intro =
    'A ATENÇÃO pode ser compreendida como a quantidade de esforço exercido para se concentrar em determinada tarefa. Refere-se ao conjunto de processos cognitivos que torna o ser humano capaz de selecionar, filtrar e organizar as informações em unidades controláveis e significativas. Nos testes onde se podem avaliar os processos atencionais pode-se perceber que:'
  const dinamico = clean(
    `Em tarefas curtas onde precisou manter o foco durante a realização do teste ${g} paciente apresentou o desempenho ${p.atencao}. Demonstrando assim, ${p.atencaoDesc} na atenção concentrada para realização de algumas tarefas.`
  )
  return `${intro} ${dinamico}`
}

function gerarMemoria(p) {
  const g = art(p.sexo)
  const G = ART(p.sexo)

  const introMemoria =
    'A MEMÓRIA é a capacidade de registrar, manter e evocar as experiências e os fatos já ocorridos. A capacidade de memorizar relaciona-se intimamente com o nível de consciência, com a atenção e com o interesse afetivo (motivação).'

  const codificacao = clean(
    p.compreendia === 'NÃO'
      ? `${p.nome} não apresentou dificuldades no processo de codificação da memória na realização das tarefas, pois parecia NÃO compreender o que era pedido;`
      : `${p.nome} apresentou dificuldades no processo de codificação da memória na realização das tarefas, pois parecia  compreender o que era pedido;`
  )

  const introTipos = clean(`${G} paciente foi submetid${g} a diversas tarefas para avaliar os seguintes tipos de memória:`)

  let curtoPrazo
  if (p.ravltA1 === p.ravltB1) {
    curtoPrazo = clean(
      `Memória de Curto Prazo: Memória de curto prazo é responsável pela manutenção mental (por um breve período) de uma quantidade limitada de informações necessárias para a resolução de algum problema imediato, por exemplo, recordar o que precisa buscar na dispensa. ${G} paciente obteve o desempenho que ${p.ravltA1} demonstrando assim apresentar ${p.ravltA1Desc} no presente momento nesse construto. Em relação a Memória Visual de Curto prazo, ${g} paciente apresentou o desempenho ${p.memoriaVCurtoPrazo} nesse constructo.`
    )
  } else {
    curtoPrazo = clean(
      `Memória de Curto Prazo: Memória de curto prazo é responsável pela manutenção mental (por um breve período) de uma quantidade limitada de informações necessárias para a resolução de algum problema imediato, por exemplo, recordar o que precisa buscar na dispensa. O desempenho d${g} paciente oscilou entre ${p.ravltA1} e ${p.ravltB1} demonstrando assim apresentar ${p.ravltA1Desc} no presente momento nesse constructo. Em relação a Memória Visual de Curto prazo, ${g} paciente apresentou o desempenho ${p.memoriaVCurtoPrazo} nesse constructo.`
    )
  }

  const memoriaOperacional = clean(
    `A Memória Operacional: pode ser definida como um conjunto de processos que nos permite armazenar e manipular informações temporárias e realizar tarefas cognitivas complexas como a compreensão da linguagem, a leitura, a aprendizagem ou o raciocínio. A memória operacional é um tipo de memória de curto prazo. Em tarefa onde pode avaliar a memória operacional, e os comandos são dados de forma verbal, ${g} paciente obteve o desempenho ${p.memoriaTrabalho}.`
  )

  const introEpisodica =
    'Memória de Longo Prazo Episódica: A memória episódica consiste na aprendizagem e recuperação de informações novas e que foram aprendidas em um contexto (tempo, espaço e pessoas presentes), que podem ser recordadas posteriormente, a partir do retorno da informação à memória da pessoa. A memória episódica verbal pode ser mensurada através da apresentação sucessiva do mesmo material (geralmente listas de palavras apresentadas fixamente ou apresentação apenas das palavras que não foram evocadas na tentativa anterior). Essa última maneira avalia, além da retenção da informação, a capacidade de aprendizagem de novo conteúdo. Os resultados obtidos nas tarefas que avaliam a recordação de informações verbais são apresentados a seguir:'

  let longoPrazo
  if (p.ravltA6 === p.ravltA7) {
    longoPrazo = clean(
      `${G} paciente apresentou ${p.ravltA6Desc} em RETER e RECUPERAR o conteúdo compreendido. Apresentando desempenho ${p.ravltA6}, reforçando a ${p.ravltA6Desc} na memória de longo prazo.`
    )
  } else {
    longoPrazo = clean(
      `${G} paciente apresentou ${p.ravltA6Desc} em RETER o que aprende, demonstrando desempenho ${p.ravltA6} e apresentou ${p.ravltA7Desc} em RECUPERAR o conteúdo compreendido, com desempenho ${p.ravltA7} na memória de longo prazo.`
    )
  }

  const velEsquecimento = clean(
    `Percebe-se também que em termos processuais (codificação, armazenamento e recuperação) na recuperação de conteúdos já apreendidos ${g} paciente tem um índice de retenção ${p.velEsquecimento}, ou seja, a sua velocidade de esquecimento está com o desempenho ${p.velEsquecimentoDesc} do esperado para a sua faixa etária.`
  )

  const recordacaoTempo = clean(
    `A recordação da lista após a passagem do tempo manteve o desempenho ${p.ravltA7} ao esperado para a idade, sugerindo que ${p.nome} apresenta ${p.ravltA7Desc} para se recordar de fatos aprendidos recentemente.`
  )

  const pistasVerbais = clean(
    `A apresentação de pistas verbais ${p.reconhecimentoDesc} das informações aprendidas anteriormente (classificação ${p.reconhecimento}).`
  )

  const memoriaSematica = clean(
    `A Memória Semântica é responsável pelo nosso conhecimento genérico do mundo. É responsável pelo uso da linguagem, pelo conhecimento organizado de palavras e símbolos verbais, seus significados e as relações entre eles, bem como pelo uso de regras, fórmulas, algoritmos para a manipulação de símbolos e conceitos. ${G} paciente apresentou capacidade em relação a categorização, conceituação, léxico e conhecimentos gerais, obtendo assim o desempenho ${p.escoreGlobal} para sua idade, apresentando ${p.escoreGlobalDesc} em sua memória semântica.`
  )

  let memoriaProspectiva
  if (p.prospInformante === p.prospPaciente) {
    memoriaProspectiva = clean(
      `A Memória Prospectiva é definida como a capacidade de recordar uma ação que se pretende realizar no futuro (intenção), num determinado momento ou local específico, sem nenhuma instrução permanente que nos lembre a realização da ação. Por exemplo, tomar a medicação em momentos específicos ou confirmar previamente procedimentos em cirurgias são exemplos de tarefas de MP. Segundo a percepção do informante e d${g} paciente, encontra-se ${p.prospInformante}. Em teste apresentou resultado ${p.memoriaProspectiva} nesse constructo.`
    )
  } else {
    memoriaProspectiva = clean(
      `A Memória Prospectiva é definida como a capacidade de recordar uma ação que se pretende realizar no futuro (intenção), num determinado momento ou local específico, sem nenhuma instrução permanente que nos lembre a realização da ação. Por exemplo, tomar a medicação em momentos específicos ou confirmar previamente procedimentos em cirurgias são exemplos de tarefas de MP. Segundo a percepção do informante encontra-se ${p.prospInformante}, porém a percepção d${g} paciente encontra-se ${p.prospPaciente}. Contudo em teste onde se avaliou a memória prospectiva pode-se averiguar que a memória prospectiva d${g} paciente encontra-se ${p.memoriaProspectiva}.`
    )
  }

  let memoriaRetrospectiva
  if (p.retrospInformante === p.retrospPaciente) {
    memoriaRetrospectiva = clean(
      `A Memória Retrospectiva é a memória de longo prazo de pessoas, palavras e eventos que aconteceram no passado, está relacionada ao armazenamento e recuperação de eventos passados. Segundo a percepção do informante e d${g} paciente, encontra-se ${p.retrospInformante}. Em observação durante a anamnese, é possível verificar que a memória retrospectiva encontra-se ${p.retrospAnamnese}.`
    )
  } else {
    memoriaRetrospectiva = clean(
      `A Memória Retrospectiva é a memória de longo prazo de pessoas, palavras e eventos que aconteceram no passado, está relacionada ao armazenamento e recuperação de eventos passados. ${p.retrospInformante}. Já na percepção d${g} paciente encontra-se ${p.retrospPaciente}. Em observação durante a anamnese, é possível verificar que a memória retrospectiva encontra-se ${p.retrospAnamnese}.`
    )
  }

  return [
    introMemoria, codificacao, introTipos, curtoPrazo, memoriaOperacional,
    introEpisodica, longoPrazo, recordacaoTempo,
    memoriaSematica, memoriaProspectiva, memoriaRetrospectiva,
  ].join(' ')
}

function gerarFuncoesExecutivas(p) {
  const g = art(p.sexo)
  const G = ART(p.sexo)

  const intro =
    'Quando se avalia as FUNÇÕES EXECUTIVAS procura-se entender a capacidade de planejamento, o controle inibitório, a flexibilidade cognitiva, a estratégia de organização e a categorização dos estímulos. Esses processos cognitivos, enquanto conjunto atua de forma coordenada, são à base da intencionalidade e autogestão do indivíduo, e permitem o direcionamento a metas, escolha de estratégias eficazes, avaliação da eficiência e adequação dos comportamentos. Além disso, os aspectos executivos também são modulados pelos aspectos emocionais, ou seja, o seu funcionamento pode ser influenciado pelas emoções intensas experimentadas pela pessoa. O funcionamento executivo está relacionado ao grau de autonomia e eficiência no desempenho funcional que o indivíduo apresenta nas suas atividades acadêmicas, profissionais e de relacionamentos interpessoais. Esses aspectos foram avaliados isoladamente e/ou conjuntamente a partir de entrevistas, observação clínica e testes psicológicos. Os resultados são descritos abaixo:'

  const sugereDepressao = p.depressao === 'SUGERE QUADRO DE DEPRESSÃO'
  const sugereAnsiedade = p.ansiedade === 'SUGERE QUADRO DE ANSIEDADE'
  let volitivos
  if (sugereDepressao || sugereAnsiedade) {
    const quadros = [
      sugereDepressao ? p.depressao : '',
      sugereDepressao && sugereAnsiedade ? ' e ' : '',
      sugereAnsiedade ? p.ansiedade : '',
    ].join('')
    volitivos = clean(
      `Os aspectos volitivos (motivação, interesse por hobbies e planos de vida) parecem estar comprometidos no momento, apresentando ${quadros}.`
    )
  } else {
    volitivos = clean(
      `Os aspectos volitivos (motivação, interesse por hobbies e planos de vida) parecem não estar comprometidos no momento.`
    )
  }

  const planejamento = clean(
    `Capacidade de planejamento, tomada de decisão e hierarquização dos passos adequados quando ocorre dentro de uma estrutura. Em tarefas onde se pode avaliar esses construtos ${p.nome} apresentou desempenho ${p.categoriasCompletas} de planejamento, abstração e insight para retomar, aprender e alterar suas estratégias quando na realização de alguma tarefa quando essa não é bem-sucedida.`
  )

  const controleInibitorios = clean(
    `Quanto ao Controle Inibitório, isto é, o automonitoramento do comportamento quando tem que suprimir uma resposta frente a um estímulo intrusivo, e que envolve processos de controle do comportamento, da atenção e dos pensamentos/emoções, ${g} paciente demonstrou ter ${p.errosNaoPersDesc} no controle da impulsividade frente às respostas cognitivas, apresentando desempenho ${p.errosPerseverativos}.`
  )

  const flexibilidade = clean(
    `A Flexibilidade Cognitiva envolve a capacidade de lidar com diferentes informações e tarefas simultaneamente e alternância do curso de ações ou dos pensamentos de acordo com as exigências do ambiente. Esta habilidade cognitiva é essencial para poder resolver problemas de modo criativo e requer a habilidade de mudar o foco de um objetivo para o outro. Nas tarefas onde se pode avaliar a flexibilidade cognitiva. ${G} paciente apresentou desempenho ${p.errosNaoPers} ao esperado demonstrando ${p.errosNaoPersDesc} em adaptar sua conduta e opiniões a acontecimentos novos, variáveis e inesperados, além de ${p.beneficioFeedback} do feedback externo.`
  )

  const introQuentesFrias = clean(
    `O funcionamento executivo inclui tanto aspectos cognitivos (mensurados por testes psicológicos) como emocionais e comportamentais. Esses aspectos podem ser subdivididos como funções executivas "quentes" e "frias", isto é, a habilidades ligadas ao controle do comportamento e dos impulsos versus o controle do raciocínio voltado para a solução de problemas. Abaixo se observa o desempenho obtido através de questionários respondidos por informante e pel${g} própri${g} paciente:`
  )

  return [intro, volitivos, planejamento, controleInibitorios, flexibilidade, introQuentesFrias].join(' ')
}

function gerarLinguagem(p) {
  const G = ART(p.sexo)

  const intro =
    'Com relação à LINGUAGEM, nas provas específicas de linguagem, e compreensão verbal observou-se que:'

  // Mapeamento de classificações para termos do texto de linguagem (contexto BAMS)
  const toLangLabel = (val) => {
    if (!val) return val
    const v = String(val).toUpperCase()
    if (v.includes('COMPROM') || v.includes('DÉFIC') || v.includes('DEFIC')) return 'DEFICITÁRIO'
    if (v === 'PRESERVADA' || v === 'PRESERVADO') return 'MÉDIO'
    return val
  }

  // Conceituação: só menciona quando não for PRESERVADA
  const concNotPreserved = p.conceituacao && !String(p.conceituacao).toUpperCase().includes('PRESERV')
  const defCatConc = concNotPreserved
    ? clean(`${G} paciente teve desempenho ${toLangLabel(p.conceituacao)} em tarefas que envolviam conceituação de palavras, desempenho ${toLangLabel(p.categorizacaoVerbal)} categorização de palavras e desempenho ${toLangLabel(p.definicaoPalavras)} em definição de vocábulos.`)
    : clean(`${G} paciente teve desempenho ${toLangLabel(p.categorizacaoVerbal)} categorização de palavras e desempenho ${toLangLabel(p.definicaoPalavras)} em definição de vocábulos.`)

  const fluencias = clean(
    `Desempenho ${toLangLabel(p.fluenciaSematica)} frente ao esperado para sua faixa etária e grau de escolaridade em tarefas envolvendo a fluência semântica e desempenho ${p.fluenciaFonemica} em fluência verbal fonêmica.`
  )

  const tokenTexto = clean(
    `Desempenho ${p.token} em tarefas que envolviam ordens diretas demonstrando assim ${p.tokenDesc} de compreensão de comandos simples e complexos.`
  )

  return [intro, defCatConc, fluencias, tokenTexto].join(' ')
}

function gerarPercepcao(p) {
  const G = ART(p.sexo)

  const intro =
    'Em relação ao domínio de PERCEPÇÃO, pode ser definida como a capacidade de organizar e processar informações do mundo (símbolos, objetos ou imagens, por exemplo), que são obtidas por meio dos sentidos, e atribuir significado a essas informações. Ela se divide em três ramificações bem desenvolvidas, sendo visual, auditivo e somestésico. Foi avaliado especificamente a habilidade visual.'

  const percepcaoTexto = clean(
    `${G} paciente apresentou desempenho avaliado e classificado como ${p.percepcao}, o que indica ${p.percepcaoDesc} neste constructo.`
  )

  return `${intro} ${percepcaoTexto}`
}

function gerarPraxia(p) {
  const G = ART(p.sexo)

  const intro =
    'PRAXIA é a sequência de movimentos necessários para a execução de atos motores mais ou menos complexos, com uma intenção e objetivo determinados por um contexto associado à organização e a capacidade de planejamento mental:'

  const construtiva = clean(
    `Praxias Construtivas é a capacidade de planejar e realizar os movimentos necessários para organizar uma série de elementos no espaço, para formar um desenho ou uma figura final. ${G} paciente obteve desempenho ${p.praxiaConstrutiva}.`
  )

  const ideomotora = clean(
    `Praxias Ideomotoras é a capacidade de realizar um movimento ou gesto simples de maneira intencionada. ${G} paciente obteve desempenho ${p.praxiaIdeomotora}.`
  )

  const reflexiva = clean(
    `Praxias Reflexivas se referem-se à habilidade de imitação de gestos, principalmente de maneira sequencial. ${G} paciente obteve desempenho ${p.praxiaReflexiva}.`
  )

  return [intro, construtiva, ideomotora, reflexiva].join(' ')
}

function gerarDepressaoAnsiedade(p) {
  const g = art(p.sexo)
  return clean(
    `Em escalas onde se mediram o nível de depressão e ansiedade vivenciad${g}s pel${g} paciente no momento ${g} paciente ${p.depressao} e ${p.ansiedade}.`
  )
}

function gerarDeclinioAVD(p) {
  const g = art(p.sexo)
  return clean(
    `Segundo as respostas dadas pelo informante de ${p.nome}, se observa que ${p.iqcode} d${g} paciente nos últimos dez anos. No que concerne as suas ATIVIDADES DIÁRIAS BÁSICAS DA VIDA DIÁRIA - são as atividades diretamente relacionadas ao cuidado do próprio corpo, atualmente ${p.avdAnamnese}. Com relação as ATIVIDADE INSTRUMENTAIS DA VIDA DIÁRIA (as atividades instrumentais da vida diária são atividades relacionadas com o meio no qual se vive, e geralmente são atividades complexas), ${g} paciente ${p.badl}. E para a realização das atividades diárias e funcionais em sua vida diária ${p.pfeffer} para a realização delas.`
  )
}

export function generateTextoConclusao(dadosPaciente) {
  const p = dadosPaciente

  const blocos = {
    discurso:           gerarDiscurso(p),
    inteligencia:       gerarInteligencia(p),
    orientacao:         gerarOrientacao(p),
    atencao:            gerarAtencao(p),
    memoria:            gerarMemoria(p),
    funcoesExecutivas:  gerarFuncoesExecutivas(p),
    linguagem:          gerarLinguagem(p),
    percepcao:          gerarPercepcao(p),
    praxia:             gerarPraxia(p),
    depressaoAnsiedade: gerarDepressaoAnsiedade(p),
    declinioAVD:        gerarDeclinioAVD(p),
  }

  blocos.textoCompleto = Object.values(blocos).filter(Boolean).join('\n\n')

  return blocos
}
