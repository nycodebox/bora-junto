export type ScreenId =
  | 'welcome'
  | 'login'
  | 'home'
  | 'groups'
  | 'group-detail'
  | 'split-pix'
  | 'ride-active';

export type ThemeMode = 'light' | 'dark';

export type TransportMode = 'bando' | 'racha' | 'carona';

export type GroupFilter = 'Todas' | 'A pé' | 'App' | 'Carona';

export interface GroupMember {
  id: string;
  name: string;
  courseInfo: string;
  roleBadge: string;
  badgeVariant: 'cyan' | 'green';
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
}

export interface RideGroup {
  id: string;
  mode: TransportMode;
  filterCategory: 'A pé' | 'App' | 'Carona';
  title: string;
  departureTime: string;
  estimatedArrival: string;
  etaMinutes: number;
  distanceLabel: string;
  meetingPoint: string;
  meetingHint: string;
  totalSpots: number;
  badgeTag: string;
  highlighted?: boolean;
  totalCost: number;
  pricePerPerson: number;
  priceDisplay: string;
  priceSub: string;
  leaderName: string;
  leaderPixKey: string;
  leaderPixMasked: string;
  members: GroupMember[];
  initialMessages: ChatMessage[];
}

export interface ScreenNavProps {
  onNavigate?: (screen: ScreenId) => void;
}
