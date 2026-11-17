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

export type RideStatus =
  | 'open'
  | 'full'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ModerationStatus = 'active' | 'temporary_block' | 'permanent_block';

export type PaymentConfirmationMethod =
  | 'pending'
  | 'receipt_upload'
  | 'visual_leader';

export type ReportCategory =
  | 'inappropriate_behavior'
  | 'immediate_risk'
  | 'fraud'
  | 'rule_violation';

export type ReportStatus = 'pendente' | 'em_analise' | 'resolvida' | 'arquivada';

export type ResolutionAction =
  | 'none'
  | 'warning'
  | 'temporary_block'
  | 'permanent_block'
  | 'overturned';

export type LocationType =
  | 'bairro'
  | 'rua'
  | 'endereco'
  | 'estabelecimento'
  | 'ponto_interesse'
  | 'municipio';

export interface GeoLocation {
  name: string;
  label: string;
  formattedAddress: string;
  neighbourhood?: string;
  city: string;
  lat: number;
  lng: number;
  category?: string;
  locationType?: LocationType;
  locationTypeLabel?: string;
  street?: string;
  housenumber?: string;
  orsLayer?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  courseInfo: string;
  campusId: string;
  phone: string;
  defaultDestinationLabel: string;
  defaultDestinationLat: number;
  defaultDestinationLng: number;
  defaultClassEndTime: string;
  moderationStatus: ModerationStatus;
  moderationReason?: string;
  lgpdConsentAt: string;
  isAdmin: boolean;
}

export interface GroupMember {
  id: string;
  uid: string;
  name: string;
  courseInfo: string;
  role: 'leader' | 'member';
  roleBadge: string;
  badgeVariant: 'cyan' | 'green';
  acceptedRecalcVersion: number;
}

export interface GroupPayment {
  uid: string;
  leaderId: string;
  amountDue: number;
  pixPayload: string;
  confirmationMethod: PaymentConfirmationMethod;
  receiptStoragePath?: string;
  receiptPreviewDataUrl?: string;
  receiptExpiresAt?: string;
  paymentConfirmed: boolean;
  confirmedByLeaderId?: string;
}

export interface LiveLocation {
  uid: string;
  lat: number;
  lng: number;
  sharingEnabled: boolean;
  updatedAtMs: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
}

export interface RideGroup {
  id: string;
  campusId: string;
  leaderId: string;
  leaderName: string;
  mode: TransportMode;
  filterCategory: 'A pé' | 'App' | 'Carona';
  status: RideStatus;
  title: string;
  departureTime: string;
  estimatedArrival: string;
  etaMinutes: number;
  distanceMeters: number;
  distanceLabel: string;
  meetingPoint: string;
  meetingHint: string;
  meetingLat: number;
  meetingLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  maxSpots: number;
  totalSpots: number;
  memberIds: string[];
  badgeTag: string;
  highlighted?: boolean;
  requiresPayment: boolean;
  totalCost: number;
  pricePerPerson: number;
  priceDisplay: string;
  priceSub: string;
  recalcVersion: number;
  scheduledAtMs: number;
  members: GroupMember[];
  paymentsByUid: Record<string, GroupPayment>;
  liveLocations: LiveLocation[];
}

export interface ModerationReport {
  id: string;
  groupId: string;
  reporterUid: string;
  reporterName: string;
  reportedUid: string;
  reportedName: string;
  category: ReportCategory;
  priority: 'normal' | 'immediate_risk';
  description: string;
  status: ReportStatus;
  resolutionAction?: ResolutionAction;
  moderatorNotes?: string;
  contestNote?: string;
  slaDeadlineAt: string;
  createdAtMs: number;
}

export interface ModerationLogEntry {
  id: string;
  reportId: string;
  moderatorUid: string;
  moderatorEmail: string;
  previousStatus: string;
  newStatus: string;
  actionTaken: string;
  createdAtMs: number;
}

export interface ScreenNavProps {
  onNavigate?: (screen: ScreenId) => void;
}
