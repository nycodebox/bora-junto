import { RideGroup } from '../types';

export const CAMPUS_HEADER = 'CAMPUS VILA MARIANA';
export const CAMPUS_ORIGIN = 'Universidade · Vila Mariana';
export const ORIGIN_SHORT = 'Vila Mariana';

export const DESTINATION_OPTIONS = [
  'Saúde, São Paulo',
  'Vila Mariana, São Paulo',
  'Moema, São Paulo',
  'Jabaquara, São Paulo',
];

export const CLASS_END_TIME_OPTIONS = [
  '21:45',
  '22:00',
  '22:15',
  '22:30',
  '22:45',
];

export const INITIAL_USER = {
  name: 'Ana',
  fullName: 'Ana Souza',
  email: 'ana.souza@universidade.edu.br',
  course: 'Sistemas · aula até 22:30',
};

export const MOCK_GROUPS: RideGroup[] = [
  {
    id: 'racha-app',
    mode: 'racha',
    filterCategory: 'App',
    title: 'Racha de App',
    departureTime: '22:35',
    estimatedArrival: '22:55',
    etaMinutes: 12,
    distanceLabel: 'a 600 m do seu destino',
    meetingPoint: 'Portão 2 · Biblioteca',
    meetingHint: 'Encontre o grupo dentro do campus.',
    totalSpots: 4,
    badgeTag: 'Melhor encaixe',
    highlighted: true,
    totalCost: 34,
    pricePerPerson: 8.5,
    priceDisplay: 'R$ 8,50',
    priceSub: 'por pessoa*',
    leaderName: 'Lucas Martins',
    leaderPixKey: '12348256719',
    leaderPixMasked: '•••.482.•••-19',
    members: [
      {
        id: 'm1',
        name: 'Lucas Martins',
        courseInfo: 'Engenharia · aula até 22:30',
        roleBadge: 'Líder',
        badgeVariant: 'cyan',
      },
      {
        id: 'm2',
        name: 'Beatriz Costa',
        courseInfo: 'Direito · aula até 22:25',
        roleBadge: 'Verificada',
        badgeVariant: 'green',
      },
      {
        id: 'm3',
        name: 'Pedro Lima',
        courseInfo: 'Design · aula até 22:35',
        roleBadge: 'Verificado',
        badgeVariant: 'green',
      },
    ],
    initialMessages: [
      {
        id: 'msg-1',
        sender: 'Lucas Martins',
        text: 'Já estou perto do Portão 2, pessoal!',
        time: '22:38',
      },
      {
        id: 'msg-2',
        sender: 'Beatriz Costa',
        text: 'Saindo da biblioteca agora, chego em 2 min.',
        time: '22:40',
      },
    ],
  },
  {
    id: 'caminhada-bando',
    mode: 'bando',
    filterCategory: 'A pé',
    title: 'Caminhada em Bando',
    departureTime: '22:30',
    estimatedArrival: '22:50',
    etaMinutes: 15,
    distanceLabel: 'a 850 m do seu destino',
    meetingPoint: 'Portão 1 · Passarela',
    meetingHint: 'Ponto de encontro iluminado dentro do campus.',
    totalSpots: 6,
    badgeTag: 'Mesmo campus',
    totalCost: 0,
    pricePerPerson: 0,
    priceDisplay: 'Gratuito',
    priceSub: 'sem custo',
    leaderName: 'Mariana Alves',
    leaderPixKey: '',
    leaderPixMasked: '',
    members: [
      {
        id: 'b1',
        name: 'Mariana Alves',
        courseInfo: 'Pedagogia · aula até 22:25',
        roleBadge: 'Líder',
        badgeVariant: 'cyan',
      },
      {
        id: 'b2',
        name: 'Rafael Nunes',
        courseInfo: 'Contabilidade · aula até 22:30',
        roleBadge: 'Verificado',
        badgeVariant: 'green',
      },
      {
        id: 'b3',
        name: 'Camila Rocha',
        courseInfo: 'Psicologia · aula até 22:20',
        roleBadge: 'Verificada',
        badgeVariant: 'green',
      },
      {
        id: 'b4',
        name: 'Thiago Dias',
        courseInfo: 'ADS · aula até 22:30',
        roleBadge: 'Verificado',
        badgeVariant: 'green',
      },
    ],
    initialMessages: [
      {
        id: 'bmsg-1',
        sender: 'Mariana Alves',
        text: 'Vamos esperar até 22:35 na saída da passarela.',
        time: '22:28',
      },
      {
        id: 'bmsg-2',
        sender: 'Rafael Nunes',
        text: 'Fechado, já estou descendo a escada.',
        time: '22:29',
      },
    ],
  },
  {
    id: 'carona-amiga',
    mode: 'carona',
    filterCategory: 'Carona',
    title: 'Carona Amiga',
    departureTime: '22:40',
    estimatedArrival: '22:55',
    etaMinutes: 10,
    distanceLabel: 'a 1,2 km do seu destino',
    meetingPoint: 'Estacionamento · Bloco B',
    meetingHint: 'Encontre o grupo dentro do campus.',
    totalSpots: 3,
    badgeTag: 'Mesmo campus',
    totalCost: 0,
    pricePerPerson: 0,
    priceDisplay: 'Gratuito',
    priceSub: 'nesta carona',
    leaderName: 'Gabriel Silva',
    leaderPixKey: '',
    leaderPixMasked: '',
    members: [
      {
        id: 'c1',
        name: 'Gabriel Silva',
        courseInfo: 'Administração · aula até 22:30',
        roleBadge: 'Líder',
        badgeVariant: 'cyan',
      },
      {
        id: 'c2',
        name: 'Julia Ferreira',
        courseInfo: 'Enfermagem · aula até 22:35',
        roleBadge: 'Verificada',
        badgeVariant: 'green',
      },
    ],
    initialMessages: [
      {
        id: 'cmsg-1',
        sender: 'Gabriel Silva',
        text: 'Estou no estacionamento do Bloco B, carro prata.',
        time: '22:36',
      },
      {
        id: 'cmsg-2',
        sender: 'Julia Ferreira',
        text: 'Chegando em 3 minutos!',
        time: '22:37',
      },
    ],
  },
];

export function extractShortDestination(fullDestination: string): string {
  const firstPart = fullDestination.split(',')[0]?.trim();
  return firstPart || 'Saúde';
}

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
