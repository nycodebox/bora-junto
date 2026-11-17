import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ADMIN_BOOTSTRAP_EMAIL,
  OperationType,
  auth,
  db,
  handleFirestoreError,
} from '../firebase';
import {
  CampusDefinition,
  SALVADOR_CAMPUSES,
  SALVADOR_DESTINATIONS,
  addMinutesToHHMM,
  computeTodayScheduledMs,
  extractShortDestination,
  formatDistanceLabel,
  getCampusById,
  haversineDistanceKm,
  haversineDistanceMeters,
  isInsideCampusGeofence,
  resolveSalvadorDestination,
  timeDiffMinutes,
} from '../utils/geo';
import {
  buildPixCopiaECola,
  formatCurrencyBRL,
  repricePixCopiaECola,
} from '../utils/pix';
import { computeBusinessSlaDeadlineIso } from '../utils/sla';
import {
  ChatMessage,
  GeoLocation,
  GroupFilter,
  GroupMember,
  GroupPayment,
  LiveLocation,
  ModerationReport,
  ReportCategory,
  RideGroup,
  ScreenId,
  ThemeMode,
  TransportMode,
  UserProfile,
} from '../types';

const PENDING_SIGNUP_PREFIX = 'borajunto_pending_profile_';

interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  courseInfo: string;
  campusId: string;
  phone: string;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  destinationLocation?: GeoLocation | null;
  classEndTime: string;
  lgpdAccepted: boolean;
}

interface CreateGroupInput {
  mode: TransportMode;
  departureTime: string;
  meetingPoint: string;
  meetingHint: string;
  meetingLat: number;
  meetingLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  destinationLocation?: GeoLocation | null;
  maxSpots: number;
  caronaIsPaid: boolean;
  totalCost: number;
  leaderPixKey: string;
}

interface BoraJuntoContextValue {
  // Navigation & Theme
  currentScreen: ScreenId;
  history: ScreenId[];
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  navigateTo: (screen: ScreenId) => void;
  jumpToScreen: (screen: ScreenId) => void;
  goBack: () => void;

  // Admin Area Toggle (separate from 390x844 student prototype)
  showAdminView: boolean;
  setShowAdminView: (show: boolean) => void;

  // Auth & User Profile
  authReady: boolean;
  firebaseUser: User | null;
  pendingVerificationEmail: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userProfile: UserProfile | null;
  userName: string;
  userEmail: string;
  authError: string | null;
  clearAuthError: () => void;
  loginAcademic: (email: string, password: string) => Promise<boolean>;
  signUpAcademic: (input: SignUpInput) => Promise<{ ok: boolean; needsVerification?: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<string>;
  checkEmailVerifiedNow: () => Promise<boolean>;
  resetPasswordAcademic: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logoutAcademic: () => Promise<void>;
  updateUserPreferences: (updates: {
    destinationLabel?: string;
    destinationLat?: number;
    destinationLng?: number;
    destinationLocation?: GeoLocation | null;
    classEndTime?: string;
    campusId?: string;
    courseInfo?: string;
    phone?: string;
  }) => Promise<void>;
  exportMyLgpdData: () => string;
  deleteMyAccountData: () => Promise<void>;

  // Trip Configuration (Home)
  currentCampus: CampusDefinition;
  destination: string;
  destinationShort: string;
  destinationCoords: { lat: number; lng: number };
  destinationLocation: GeoLocation | null;
  setDestinationWithCoords: (label: string, lat?: number, lng?: number, location?: GeoLocation | null) => void;
  setDestinationLocation: (location: GeoLocation) => void;
  classEndTime: string;
  setClassEndTime: (time: string) => void;
  selectedMode: TransportMode;
  setSelectedMode: (mode: TransportMode) => void;

  // Groups & Selection
  activeFilter: GroupFilter;
  setActiveFilter: (filter: GroupFilter) => void;
  groups: RideGroup[];
  myCreatedGroups: RideGroup[];
  filteredGroups: RideGroup[];
  selectedGroup: RideGroup | null;
  selectGroup: (groupId: string) => void;
  joinedGroupId: string | null;
  activeRideGroup: RideGroup | null;
  createGroup: (input: CreateGroupInput) => Promise<{ ok: boolean; groupId?: string; error?: string }>;
  joinSelectedGroup: () => Promise<'split-pix' | 'ride-active' | null>;
  leaveGroup: (groupId: string) => Promise<void>;

  // Payment, RF08/RF09/RF10
  submitReceiptUpload: (groupId: string, file: File) => Promise<{ ok: boolean; error?: string }>;
  confirmMemberPaymentVisual: (groupId: string, memberUid: string) => Promise<void>;
  startGroupRide: (groupId: string) => Promise<{ ok: boolean; error?: string }>;
  removeAbsentMemberWithRecalc: (groupId: string, targetUid: string) => Promise<{ ok: boolean; error?: string }>;
  acceptRecalculation: (groupId: string) => Promise<void>;
  completeGroupRide: (groupId: string) => Promise<void>;

  // Chat & Live GPS
  chatMessages: ChatMessage[];
  unreadMessagesCount: number;
  markChatRead: () => void;
  sendChatMessage: (text: string) => Promise<void>;
  gpsStatus: 'inactive' | 'sharing' | 'denied' | 'unavailable';

  // Ratings, Reports & Contestation
  myReportsAgainstMe: ModerationReport[];
  submitPostTripRating: (groupId: string, score: number, safetyOk: boolean, comment: string) => Promise<void>;
  submitReport: (params: {
    groupId: string;
    reportedUid: string;
    reportedName: string;
    category: ReportCategory;
    description: string;
  }) => Promise<void>;
  contestModerationReport: (reportId: string, contestNote: string) => Promise<void>;
}

const BoraJuntoContext = createContext<BoraJuntoContextValue | null>(null);

function formatFirebaseTimestampHHMM(ts: unknown): string {
  if (ts && typeof (ts as Timestamp).toDate === 'function') {
    const d = (ts as Timestamp).toDate();
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  return 'Agora';
}

function formatFirebaseTimestampMs(ts: unknown): number {
  if (ts && typeof (ts as Timestamp).toMillis === 'function') {
    return (ts as Timestamp).toMillis();
  }
  return Date.now();
}

function compressReceiptImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo do comprovante.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        const maxSide = 720;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        if (dataUrl.length > 180000) {
          resolve(canvas.toDataURL('image/jpeg', 0.45));
        } else {
          resolve(dataUrl);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function mapAuthErrorToPtBr(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'O provedor E-mail/Senha ainda não foi ativado no Firebase Console (Authentication → Sign-in method).';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail acadêmico ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail acadêmico já possui uma conta cadastrada.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Sem conexão no momento. Verifique sua internet.';
    default:
      return err instanceof Error ? err.message : 'Erro ao autenticar.';
  }
}

export const BoraJuntoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [history, setHistory] = useState<ScreenId[]>(['welcome']);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [showAdminView, setShowAdminView] = useState<boolean>(false);

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [verifiedTokenReady, setVerifiedTokenReady] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [campusId, setCampusId] = useState<string>(SALVADOR_CAMPUSES[0].id);
  const [destination, setDestination] = useState<string>(SALVADOR_DESTINATIONS[0].label);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number }>({
    lat: SALVADOR_DESTINATIONS[0].lat,
    lng: SALVADOR_DESTINATIONS[0].lng,
  });
  const [destinationLocation, setDestinationLocationState] = useState<GeoLocation | null>({
    name: SALVADOR_DESTINATIONS[0].shortLabel,
    label: SALVADOR_DESTINATIONS[0].label,
    formattedAddress: SALVADOR_DESTINATIONS[0].label,
    neighbourhood: SALVADOR_DESTINATIONS[0].shortLabel,
    city: 'Salvador',
    lat: SALVADOR_DESTINATIONS[0].lat,
    lng: SALVADOR_DESTINATIONS[0].lng,
    category: 'neighbourhood',
  });
  const [classEndTime, setClassEndTimeState] = useState<string>('22:30');
  const [selectedMode, setSelectedMode] = useState<TransportMode>('racha');

  const [activeFilter, setActiveFilter] = useState<GroupFilter>('Todas');
  const [rawGroups, setRawGroups] = useState<Omit<RideGroup, 'members' | 'paymentsByUid' | 'liveLocations' | 'distanceMeters' | 'distanceLabel' | 'pricePerPerson' | 'priceDisplay' | 'priceSub'>[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Subcollections for active detail / joined ride
  const [membersByGroupId, setMembersByGroupId] = useState<Record<string, GroupMember[]>>({});
  const [paymentsByGroupId, setPaymentsByGroupId] = useState<Record<string, Record<string, GroupPayment>>>({});
  const [liveLocsByGroupId, setLiveLocsByGroupId] = useState<Record<string, LiveLocation[]>>({});
  const [chatByGroupId, setChatByGroupId] = useState<Record<string, ChatMessage[]>>({});
  const [unreadByGroup, setUnreadByGroup] = useState<Record<string, number>>({});
  const lastSeenMsgCountRef = useRef<Record<string, number>>({});

  const [gpsStatus, setGpsStatus] = useState<'inactive' | 'sharing' | 'denied' | 'unavailable'>('inactive');
  const [myReportsAgainstMe, setMyReportsAgainstMe] = useState<ModerationReport[]>([]);

  const isAuthenticated = Boolean(firebaseUser && firebaseUser.emailVerified && verifiedTokenReady);
  const currentCampus = useMemo(() => getCampusById(campusId), [campusId]);

  const navigateTo = useCallback(
    (screen: ScreenId) => {
      setHistory((prev) => {
        if (prev[prev.length - 1] === screen) return prev;
        return [...prev, screen];
      });
      setCurrentScreen(screen);
    },
    []
  );

  const jumpToScreen = useCallback((screen: ScreenId) => {
    const defaultPaths: Record<ScreenId, ScreenId[]> = {
      welcome: ['welcome'],
      login: ['welcome', 'login'],
      home: ['welcome', 'login', 'home'],
      groups: ['welcome', 'login', 'home', 'groups'],
      'group-detail': ['welcome', 'login', 'home', 'groups', 'group-detail'],
      'split-pix': ['welcome', 'login', 'home', 'groups', 'group-detail', 'split-pix'],
      'ride-active': ['welcome', 'login', 'home', 'groups', 'group-detail', 'ride-active'],
    };
    setHistory(defaultPaths[screen]);
    setCurrentScreen(screen);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) {
        setCurrentScreen('home');
        return ['home'];
      }
      const nextHistory = prev.slice(0, -1);
      setCurrentScreen(nextHistory[nextHistory.length - 1]);
      return nextHistory;
    });
  }, []);

  // Seed Salvador campuses idempotently once verified
  const ensureSalvadorCampusesSeeded = useCallback(async () => {
    for (const c of SALVADOR_CAMPUSES) {
      const ref = doc(db, 'campuses', c.id);
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            id: c.id,
            name: c.name,
            shortName: c.shortName,
            headerLabel: c.headerLabel,
            city: c.city,
            centerLat: c.centerLat,
            centerLng: c.centerLng,
            geofenceRadiusMeters: c.geofenceRadiusMeters,
          });
        }
      } catch (err) {
        // Ignore if campus already seeded or admin-protected on update; throw on unexpected failure
        console.warn('Campus seed check:', err);
      }
    }
  }, []);

  // Ensure user public/private profile exists once verified
  const ensureUserProfileDocs = useCallback(async (user: User) => {
    const activeAuthUser = auth.currentUser;
    if (!activeAuthUser || activeAuthUser.uid !== user.uid) {
      throw new Error('Sessão autenticada não corresponde ao perfil solicitado.');
    }

    const publicRef = doc(db, 'users', user.uid);
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');

    let publicSnap;
    try {
      publicSnap = await getDoc(publicRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }

    let privateSnap;
    try {
      privateSnap = await getDoc(privateRef);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.GET,
        `users/${user.uid}/private/info`
      );
    }

    if (!publicSnap.exists() || !privateSnap.exists()) {
      const pendingRaw = localStorage.getItem(`${PENDING_SIGNUP_PREFIX}${user.uid}`);
      let pending: Partial<SignUpInput> | null = null;
      if (pendingRaw) {
        try {
          pending = JSON.parse(pendingRaw) as Partial<SignUpInput>;
        } catch {
          pending = null;
        }
      }

      const tokenResult = await user.getIdTokenResult();
      const tokenEmail =
        typeof tokenResult.claims.email === 'string'
          ? tokenResult.claims.email
          : user.email || '';

      const fallbackName =
        pending?.fullName ||
        user.displayName ||
        (tokenEmail.split('@')[0]?.split(/[._-]/)[0] || 'Estudante');
      const displayName =
        fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
      const selectedCampusId = pending?.campusId || SALVADOR_CAMPUSES[0].id;
      const defaultDest =
        pending?.destinationLabel || SALVADOR_DESTINATIONS[0].label;
      const resolvedDest = resolveSalvadorDestination(defaultDest);

      if (!publicSnap.exists()) {
        try {
          await setDoc(publicRef, {
            uid: user.uid,
            displayName: displayName.slice(0, 80),
            courseInfo: (pending?.courseInfo || 'Graduação · UCSAL').slice(0, 120),
            campusId: selectedCampusId,
            moderationStatus: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
      }

      if (!privateSnap.exists()) {
        try {
          await setDoc(privateRef, {
            uid: user.uid,
            email: tokenEmail,
            phone: (pending?.phone || '').slice(0, 24),
            defaultDestinationLabel: defaultDest.slice(0, 140),
            defaultDestinationLat: pending?.destinationLat ?? resolvedDest.lat,
            defaultDestinationLng: pending?.destinationLng ?? resolvedDest.lng,
            defaultClassEndTime: pending?.classEndTime || '22:30',
            lgpdConsentAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `users/${user.uid}/private/info`
          );
        }
      }

      if (pendingRaw) {
        localStorage.removeItem(`${PENDING_SIGNUP_PREFIX}${user.uid}`);
      }
    }
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (!user) {
        setVerifiedTokenReady(false);
        setUserProfile(null);
        setPendingVerificationEmail(null);
        setRawGroups([]);
        setMembersByGroupId({});
        setPaymentsByGroupId({});
        setLiveLocsByGroupId({});
        setChatByGroupId({});
        setMyReportsAgainstMe([]);
        setShowAdminView(false);
        return;
      }

      if (!user.emailVerified) {
        setVerifiedTokenReady(false);
        setPendingVerificationEmail(user.email || null);
        setUserProfile(null);
        return;
      }

      setPendingVerificationEmail(null);
      try {
        const tokenResult = await user.getIdTokenResult();
        if (!tokenResult.claims.email_verified) {
          await user.getIdToken(true);
        }
        await ensureSalvadorCampusesSeeded();
        await ensureUserProfileDocs(user);
        setVerifiedTokenReady(true);
      } catch (err) {
        console.error(err);
        setVerifiedTokenReady(false);
      }
    });

    return () => unsub();
  }, [ensureSalvadorCampusesSeeded, ensureUserProfileDocs]);

  // Attach user profile & moderation listeners ONLY when authenticated, verified & token refreshed
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !verifiedTokenReady) return;

    const uid = firebaseUser.uid;
    let publicData: Record<string, unknown> | null = null;
    let privateData: Record<string, unknown> | null = null;
    let adminDocExists = false;

    const recomputeProfile = () => {
      if (!publicData) return;
      const email = String(privateData?.email || firebaseUser.email || '');
      const isBootstrapAdmin =
        email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
      const profile: UserProfile = {
        uid,
        displayName: String(publicData.displayName || firebaseUser.displayName || 'Estudante'),
        email,
        courseInfo: String(publicData.courseInfo || 'Graduação · UCSAL'),
        campusId: String(publicData.campusId || SALVADOR_CAMPUSES[0].id),
        phone: String(privateData?.phone || ''),
        defaultDestinationLabel: String(
          privateData?.defaultDestinationLabel || SALVADOR_DESTINATIONS[0].label
        ),
        defaultDestinationLat: Number(
          privateData?.defaultDestinationLat ?? SALVADOR_DESTINATIONS[0].lat
        ),
        defaultDestinationLng: Number(
          privateData?.defaultDestinationLng ?? SALVADOR_DESTINATIONS[0].lng
        ),
        defaultClassEndTime: String(privateData?.defaultClassEndTime || '22:30'),
        moderationStatus: (publicData.moderationStatus as UserProfile['moderationStatus']) || 'active',
        moderationReason: publicData.moderationReason
          ? String(publicData.moderationReason)
          : undefined,
        lgpdConsentAt: String(privateData?.lgpdConsentAt || ''),
        isAdmin: isBootstrapAdmin || adminDocExists,
      };
      setUserProfile(profile);
      setCampusId(profile.campusId);
      setDestination(profile.defaultDestinationLabel);
      setDestinationCoords({
        lat: profile.defaultDestinationLat,
        lng: profile.defaultDestinationLng,
      });
      setDestinationLocationState({
        name: extractShortDestination(profile.defaultDestinationLabel),
        label: profile.defaultDestinationLabel,
        formattedAddress: profile.defaultDestinationLabel,
        city: 'Salvador',
        lat: profile.defaultDestinationLat,
        lng: profile.defaultDestinationLng,
      });
      setClassEndTimeState(profile.defaultClassEndTime);
    };

    const unsubPublic = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          publicData = snap.data();
          recomputeProfile();
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubPrivate = onSnapshot(
      doc(db, 'users', uid, 'private', 'info'),
      (snap) => {
        if (snap.exists()) {
          privateData = snap.data();
          recomputeProfile();
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`)
    );

    const unsubAdmin = onSnapshot(
      doc(db, 'admins', uid),
      (snap) => {
        adminDocExists = snap.exists();
        recomputeProfile();
      },
      () => {
        adminDocExists = false;
      }
    );

    const reportsQuery = query(
      collection(db, 'reports'),
      where('reportedUid', '==', uid)
    );
    const unsubReports = onSnapshot(
      reportsQuery,
      (snap) => {
        const items: ModerationReport[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            groupId: String(data.groupId || ''),
            reporterUid: String(data.reporterUid || ''),
            reporterName: String(data.reporterName || ''),
            reportedUid: String(data.reportedUid || ''),
            reportedName: String(data.reportedName || ''),
            category: data.category as ReportCategory,
            priority: (data.priority as 'normal' | 'immediate_risk') || 'normal',
            description: String(data.description || ''),
            status: data.status as ModerationReport['status'],
            resolutionAction: data.resolutionAction as ModerationReport['resolutionAction'],
            moderatorNotes: data.moderatorNotes ? String(data.moderatorNotes) : undefined,
            contestNote: data.contestNote ? String(data.contestNote) : undefined,
            slaDeadlineAt: String(data.slaDeadlineAt || ''),
            createdAtMs: formatFirebaseTimestampMs(data.createdAt),
          };
        });
        setMyReportsAgainstMe(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
    );

    return () => {
      unsubPublic();
      unsubPrivate();
      unsubAdmin();
      unsubReports();
    };
  }, [authReady, firebaseUser, verifiedTokenReady, authRefreshTick]);

  // Listen to active campus groups + groups led or joined by the current student (deduplicated)
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !verifiedTokenReady) {
      setRawGroups([]);
      return;
    }

    type RawRideGroupItem = Omit<
      RideGroup,
      | 'members'
      | 'paymentsByUid'
      | 'liveLocations'
      | 'distanceMeters'
      | 'distanceLabel'
      | 'pricePerPerson'
      | 'priceDisplay'
      | 'priceSub'
    >;

    const uid = firebaseUser.uid;
    const campusMap = new Map<string, RawRideGroupItem>();
    const leaderMap = new Map<string, RawRideGroupItem>();
    const memberMap = new Map<string, RawRideGroupItem>();

    const mapGroupDoc = (d: { id: string; data: () => Record<string, unknown> }): RawRideGroupItem => {
      const data = d.data();
      const mode = (data.mode as TransportMode) || 'racha';
      const filterCategory: RideGroup['filterCategory'] =
        mode === 'bando' ? 'A pé' : mode === 'racha' ? 'App' : 'Carona';
      const totalCost = Number(data.totalCost || 0);
      const maxSpots = Number(data.maxSpots || 4);
      const memberIds = Array.isArray(data.memberIds)
        ? (data.memberIds as string[])
        : [];
      const destLat = Number(data.destinationLat || SALVADOR_DESTINATIONS[0].lat);
      const destLng = Number(data.destinationLng || SALVADOR_DESTINATIONS[0].lng);
      const groupCampusId = String(data.campusId || campusId);
      const campus = getCampusById(groupCampusId);
      const routeMeters = Math.round(
        haversineDistanceMeters(
          { lat: campus.centerLat, lng: campus.centerLng },
          { lat: destLat, lng: destLng }
        ) * 1.25
      );
      const etaMin =
        mode === 'bando'
          ? Math.max(8, Math.round(routeMeters / 80))
          : Math.max(6, Math.round(routeMeters / 520));

      return {
        id: d.id,
        campusId: groupCampusId,
        leaderId: String(data.leaderId || ''),
        leaderName: '',
        mode,
        filterCategory,
        status: (data.status as RideGroup['status']) || 'open',
        title: String(data.title || 'Grupo BoraJunto'),
        departureTime: String(data.departureTime || '22:35'),
        estimatedArrival: String(data.estimatedArrival || '22:55'),
        etaMinutes: etaMin,
        meetingPoint: String(data.meetingPoint || ''),
        meetingHint: 'Encontre o grupo dentro do campus.',
        meetingLat: Number(data.meetingLat || campus.centerLat),
        meetingLng: Number(data.meetingLng || campus.centerLng),
        destinationLabel: String(data.destinationLabel || ''),
        destinationLat: destLat,
        destinationLng: destLng,
        maxSpots,
        totalSpots: maxSpots,
        memberIds,
        badgeTag: 'Mesmo campus',
        highlighted: false,
        requiresPayment: Boolean(data.requiresPayment),
        totalCost,
        recalcVersion: Number(data.recalcVersion || 1),
        scheduledAtMs: Number(data.scheduledAtMs || Date.now()),
      };
    };

    const syncMergedGroups = () => {
      const deduped = new Map<string, RawRideGroupItem>();

      for (const item of campusMap.values()) {
        if (item.status !== 'cancelled') deduped.set(item.id, item);
      }
      for (const item of memberMap.values()) {
        if (item.status !== 'cancelled') deduped.set(item.id, item);
      }
      for (const item of leaderMap.values()) {
        if (item.status !== 'cancelled') deduped.set(item.id, item);
      }

      const nextList = Array.from(deduped.values()).sort(
        (a, b) => a.scheduledAtMs - b.scheduledAtMs
      );
      setRawGroups(nextList);
    };

    const campusGroupsQ = query(
      collection(db, 'groups'),
      where('campusId', '==', campusId)
    );
    const leaderGroupsQ = query(
      collection(db, 'groups'),
      where('leaderId', '==', uid)
    );
    const memberGroupsQ = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', uid)
    );

    const unsubCampus = onSnapshot(
      campusGroupsQ,
      (snap) => {
        campusMap.clear();
        snap.docs.forEach((d) => {
          const item = mapGroupDoc(d);
          campusMap.set(item.id, item);
        });
        syncMergedGroups();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'groups')
    );

    const unsubLeader = onSnapshot(
      leaderGroupsQ,
      (snap) => {
        leaderMap.clear();
        snap.docs.forEach((d) => {
          const item = mapGroupDoc(d);
          leaderMap.set(item.id, item);
        });
        syncMergedGroups();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'groups')
    );

    const unsubMember = onSnapshot(
      memberGroupsQ,
      (snap) => {
        memberMap.clear();
        snap.docs.forEach((d) => {
          const item = mapGroupDoc(d);
          memberMap.set(item.id, item);
        });
        syncMergedGroups();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'groups')
    );

    return () => {
      unsubCampus();
      unsubLeader();
      unsubMember();
    };
  }, [authReady, firebaseUser, campusId, verifiedTokenReady]);

  // Attach /members listener for listed groups so card counts & member names are always accurate
  const rawGroupIdsKey = rawGroups.map((g) => g.id).sort().join('|');
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !verifiedTokenReady || !rawGroupIdsKey) {
      return;
    }

    const groupIds = rawGroupIdsKey.split('|').filter(Boolean);
    const unsubs = groupIds.map((gid) =>
      onSnapshot(
        query(
          collection(db, 'groups', gid, 'members'),
          where('role', 'in', ['leader', 'member'])
        ),
        (snap) => {
          const members: GroupMember[] = snap.docs
            .map((d) => {
              const data = d.data();
              const role = (data.role as 'leader' | 'member') || 'member';
              return {
                id: d.id,
                uid: String(data.uid || d.id),
                name: String(data.name || 'Estudante'),
                courseInfo: String(data.courseInfo || ''),
                role,
                roleBadge: role === 'leader' ? 'Líder' : 'Verificado',
                badgeVariant: (role === 'leader' ? 'cyan' : 'green') as 'cyan' | 'green',
                acceptedRecalcVersion: Number(data.acceptedRecalcVersion || 1),
              };
            })
            .sort((a, b) => (a.role === 'leader' ? -1 : b.role === 'leader' ? 1 : 0));

          setMembersByGroupId((prev) => ({ ...prev, [gid]: members }));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `groups/${gid}/members`)
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, verifiedTokenReady, rawGroupIdsKey]);

  // Determine joined group ID from live groups
  const joinedGroupId = useMemo(() => {
    if (!firebaseUser) return null;
    const activeJoined = rawGroups.find(
      (g) =>
        g.memberIds.includes(firebaseUser.uid) &&
        g.status !== 'completed' &&
        g.status !== 'cancelled'
    );
    if (activeJoined) return activeJoined.id;
    const anyJoined = rawGroups.find((g) => g.memberIds.includes(firebaseUser.uid));
    return anyJoined?.id || null;
  }, [rawGroups, firebaseUser]);

  // Attach payments, liveLocations, and messages listeners for focused group(s) (selected or joined)
  const focusedGroupIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedGroupId) ids.add(selectedGroupId);
    if (joinedGroupId) ids.add(joinedGroupId);
    return Array.from(ids);
  }, [selectedGroupId, joinedGroupId]);

  const focusedIdsKey = focusedGroupIds.sort().join('|');

  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !verifiedTokenReady || !focusedIdsKey) {
      return;
    }

    const uid = firebaseUser.uid;
    const unsubs: Array<() => void> = [];

    for (const gid of focusedIdsKey.split('|').filter(Boolean)) {
      const targetGroup = rawGroups.find((g) => g.id === gid);
      const isMember = targetGroup?.memberIds.includes(uid);
      const isLeader = targetGroup?.leaderId === uid;

      // Payments listener (leader reads all group payments; member reads own payment doc)
      if (isLeader) {
        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'groups', gid, 'payments'),
              where('leaderId', '==', uid)
            ),
            (snap) => {
              const map: Record<string, GroupPayment> = {};
              snap.docs.forEach((d) => {
                const data = d.data();
                const expiresAt = data.receiptExpiresAt ? String(data.receiptExpiresAt) : undefined;
                const isExpired = expiresAt ? Date.now() > Date.parse(expiresAt) : false;

                // RNF01: Purge expired receipt preview after 7 days while preserving paymentConfirmed boolean
                if (isExpired && data.receiptPreviewDataUrl) {
                  void updateDoc(doc(db, 'groups', gid, 'payments', d.id), {
                    receiptPreviewDataUrl: '',
                    receiptExpiresAt: '',
                    updatedAt: serverTimestamp(),
                  }).catch(() => {});
                }

                map[d.id] = {
                  uid: String(data.uid || d.id),
                  leaderId: String(data.leaderId || ''),
                  amountDue: Number(data.amountDue || 0),
                  pixPayload: String(data.pixPayload || ''),
                  confirmationMethod:
                    (data.confirmationMethod as GroupPayment['confirmationMethod']) ||
                    'pending',
                  receiptStoragePath: data.receiptStoragePath
                    ? String(data.receiptStoragePath)
                    : undefined,
                  receiptPreviewDataUrl:
                    !isExpired && data.receiptPreviewDataUrl
                      ? String(data.receiptPreviewDataUrl)
                      : undefined,
                  receiptExpiresAt: !isExpired ? expiresAt : undefined,
                  paymentConfirmed: Boolean(data.paymentConfirmed),
                  confirmedByLeaderId: data.confirmedByLeaderId
                    ? String(data.confirmedByLeaderId)
                    : undefined,
                };
              });
              setPaymentsByGroupId((prev) => ({ ...prev, [gid]: map }));
            },
            (err) =>
              handleFirestoreError(err, OperationType.LIST, `groups/${gid}/payments`)
          )
        );
      } else if (isMember) {
        unsubs.push(
          onSnapshot(
            doc(db, 'groups', gid, 'payments', uid),
            (d) => {
              if (!d.exists()) return;
              const data = d.data();
              const expiresAt = data.receiptExpiresAt ? String(data.receiptExpiresAt) : undefined;
              const isExpired = expiresAt ? Date.now() > Date.parse(expiresAt) : false;

              if (isExpired && data.receiptPreviewDataUrl) {
                void updateDoc(doc(db, 'groups', gid, 'payments', uid), {
                  receiptPreviewDataUrl: '',
                  receiptExpiresAt: '',
                  updatedAt: serverTimestamp(),
                }).catch(() => {});
              }

              setPaymentsByGroupId((prev) => ({
                ...prev,
                [gid]: {
                  ...(prev[gid] || {}),
                  [uid]: {
                    uid: String(data.uid || uid),
                    leaderId: String(data.leaderId || ''),
                    amountDue: Number(data.amountDue || 0),
                    pixPayload: String(data.pixPayload || ''),
                    confirmationMethod:
                      (data.confirmationMethod as GroupPayment['confirmationMethod']) ||
                      'pending',
                    receiptStoragePath: data.receiptStoragePath
                      ? String(data.receiptStoragePath)
                      : undefined,
                    receiptPreviewDataUrl:
                      !isExpired && data.receiptPreviewDataUrl
                        ? String(data.receiptPreviewDataUrl)
                        : undefined,
                    receiptExpiresAt: !isExpired ? expiresAt : undefined,
                    paymentConfirmed: Boolean(data.paymentConfirmed),
                    confirmedByLeaderId: data.confirmedByLeaderId
                      ? String(data.confirmedByLeaderId)
                      : undefined,
                  },
                },
              }));
            },
            (err) =>
              handleFirestoreError(
                err,
                OperationType.GET,
                `groups/${gid}/payments/${uid}`
              )
          )
        );
      }

      // LiveLocations & Chat Messages only for verified members of the group
      if (isMember) {
        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'groups', gid, 'liveLocations'),
              where('sharingEnabled', 'in', [true, false])
            ),
            (snap) => {
              const locs: LiveLocation[] = snap.docs.map((d) => {
                const data = d.data();
                return {
                  uid: String(data.uid || d.id),
                  lat: Number(data.lat || 0),
                  lng: Number(data.lng || 0),
                  sharingEnabled: Boolean(data.sharingEnabled),
                  updatedAtMs: formatFirebaseTimestampMs(data.updatedAt),
                };
              });
              setLiveLocsByGroupId((prev) => ({ ...prev, [gid]: locs }));
            },
            (err) =>
              handleFirestoreError(
                err,
                OperationType.LIST,
                `groups/${gid}/liveLocations`
              )
          )
        );

        const msgsQ = query(
          collection(db, 'groups', gid, 'messages'),
          orderBy('createdAt', 'asc')
        );
        unsubs.push(
          onSnapshot(
            msgsQ,
            (snap) => {
              const msgs: ChatMessage[] = snap.docs.map((d) => {
                const data = d.data();
                const senderId = String(data.senderId || '');
                return {
                  id: d.id,
                  senderId,
                  sender: String(data.senderName || 'Estudante'),
                  text: String(data.text || ''),
                  time: formatFirebaseTimestampHHMM(data.createdAt),
                  isMe: senderId === uid,
                };
              });

              const prevSeen = lastSeenMsgCountRef.current[gid] ?? 0;
              if (msgs.length > prevSeen) {
                const newForeignCount = msgs
                  .slice(prevSeen)
                  .filter((m) => !m.isMe).length;
                if (newForeignCount > 0) {
                  setUnreadByGroup((uPrev) => ({
                    ...uPrev,
                    [gid]: (uPrev[gid] || 0) + newForeignCount,
                  }));
                }
              }
              lastSeenMsgCountRef.current[gid] = msgs.length;
              setChatByGroupId((prev) => ({ ...prev, [gid]: msgs }));
            },
            (err) =>
              handleFirestoreError(err, OperationType.LIST, `groups/${gid}/messages`)
          )
        );
      }
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, verifiedTokenReady, focusedIdsKey, rawGroups]);

  // Hydrate full RideGroup objects with Haversine distance to user's destination
  const groups: RideGroup[] = useMemo(() => {
    return rawGroups.map((g) => {
      const members = membersByGroupId[g.id] || [];
      const leaderMember = members.find((m) => m.uid === g.leaderId);
      const paymentsByUid = paymentsByGroupId[g.id] || {};
      const liveLocations = liveLocsByGroupId[g.id] || [];

      const destDistMeters = haversineDistanceMeters(destinationCoords, {
        lat: g.destinationLat,
        lng: g.destinationLng,
      });

      const divisor =
        g.recalcVersion > 1 ? Math.max(1, g.memberIds.length) : g.maxSpots;
      const pricePerPerson =
        g.requiresPayment && g.totalCost > 0
          ? Number((g.totalCost / divisor).toFixed(2))
          : 0;

      const timeDiff = timeDiffMinutes(classEndTime, g.departureTime);
      const badgeTag =
        destDistMeters <= 900 && timeDiff <= 10 ? 'Melhor encaixe' : 'Mesmo campus';

      const campus = getCampusById(g.campusId);
      const selectedMp = campus.meetingPoints.find(
        (mp) => mp.label === g.meetingPoint
      );

      return {
        ...g,
        leaderName: leaderMember?.name || 'Líder do grupo',
        meetingHint: selectedMp?.hint || g.meetingHint,
        distanceMeters: Math.round(destDistMeters),
        distanceLabel: formatDistanceLabel(destDistMeters),
        badgeTag,
        highlighted: g.mode === selectedMode,
        pricePerPerson,
        priceDisplay:
          g.requiresPayment && pricePerPerson > 0
            ? formatCurrencyBRL(pricePerPerson)
            : 'Gratuito',
        priceSub:
          g.requiresPayment && pricePerPerson > 0
            ? 'por pessoa*'
            : g.mode === 'carona'
            ? 'nesta carona'
            : 'sem custo',
        members,
        paymentsByUid,
        liveLocations,
      };
    });
  }, [
    rawGroups,
    membersByGroupId,
    paymentsByGroupId,
    liveLocsByGroupId,
    destinationCoords,
    classEndTime,
    selectedMode,
  ]);

  // Active groups created by the authenticated student — always visible in "Meus grupos" regardless of compatibility/modality filters
  const myCreatedGroups = useMemo(() => {
    if (!firebaseUser) return [];
    const uid = firebaseUser.uid;
    return groups
      .filter(
        (g) =>
          g.leaderId === uid &&
          (g.status === 'open' || g.status === 'full' || g.status === 'in_progress')
      )
      .sort((a, b) => a.scheduledAtMs - b.scheduledAtMs);
  }, [groups, firebaseUser]);

  // RF02: Strictly filter third-party groups by <= 2 km Haversine between final destinations AND <= 15 min class end time diff.
  // Creator's own active groups live in `myCreatedGroups` so they are never duplicated in the feed.
  const compatibleGroups = useMemo(() => {
    const myCreatedIds = new Set(myCreatedGroups.map((g) => g.id));
    return groups.filter((g) => {
      if (myCreatedIds.has(g.id)) return false;
      if (firebaseUser && g.leaderId === firebaseUser.uid) return false;

      // Keep active groups the user already joined as a participant visible
      if (firebaseUser && g.memberIds.includes(firebaseUser.uid)) {
        return g.status === 'open' || g.status === 'full' || g.status === 'in_progress';
      }
      if (g.status !== 'open' && g.status !== 'full') return false;
      if (g.campusId !== campusId) return false;
      const distKm = haversineDistanceKm(destinationCoords, {
        lat: g.destinationLat,
        lng: g.destinationLng,
      });
      const minutesDiff = timeDiffMinutes(classEndTime, g.departureTime);
      return distKm <= 2.0 && minutesDiff <= 15;
    });
  }, [groups, myCreatedGroups, campusId, destinationCoords, classEndTime, firebaseUser]);

  const filteredGroups = useMemo(() => {
    if (activeFilter === 'Todas') return compatibleGroups;
    if (activeFilter === 'A pé')
      return compatibleGroups.filter((g) => g.mode === 'bando');
    if (activeFilter === 'App')
      return compatibleGroups.filter((g) => g.mode === 'racha');
    return compatibleGroups.filter((g) => g.mode === 'carona');
  }, [activeFilter, compatibleGroups]);

  const selectedGroup = useMemo(() => {
    if (selectedGroupId) {
      return groups.find((g) => g.id === selectedGroupId) || null;
    }
    return myCreatedGroups[0] || filteredGroups[0] || groups[0] || null;
  }, [groups, myCreatedGroups, filteredGroups, selectedGroupId]);

  const activeRideGroup = useMemo(() => {
    if (
      selectedGroup &&
      firebaseUser &&
      (selectedGroup.leaderId === firebaseUser.uid ||
        selectedGroup.memberIds.includes(firebaseUser.uid))
    ) {
      return selectedGroup;
    }
    if (joinedGroupId) {
      return groups.find((g) => g.id === joinedGroupId) || selectedGroup;
    }
    return selectedGroup;
  }, [groups, joinedGroupId, selectedGroup, firebaseUser]);

  // RF04: Real-time GPS watch ONLY while joined active group status === 'in_progress'
  useEffect(() => {
    if (
      !authReady ||
      !firebaseUser ||
      !firebaseUser.emailVerified ||
      !activeRideGroup ||
      !activeRideGroup.memberIds.includes(firebaseUser.uid) ||
      activeRideGroup.status !== 'in_progress'
    ) {
      setGpsStatus('inactive');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }

    setGpsStatus('sharing');
    let lastSentMs = 0;

    const pushCoords = async (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastSentMs < 4000) return;
      lastSentMs = now;
      const locRef = doc(
        db,
        'groups',
        activeRideGroup.id,
        'liveLocations',
        firebaseUser.uid
      );
      try {
        await setDoc(locRef, {
          uid: firebaseUser.uid,
          lat,
          lng,
          sharingEnabled: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('GPS update error:', err);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        void pushCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      // Stop sharing when leaving active ride state
      const locRef = doc(
        db,
        'groups',
        activeRideGroup.id,
        'liveLocations',
        firebaseUser.uid
      );
      void updateDoc(locRef, {
        sharingEnabled: false,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      setGpsStatus('inactive');
    };
  }, [
    authReady,
    firebaseUser,
    activeRideGroup?.id,
    activeRideGroup?.status,
    activeRideGroup?.memberIds,
  ]);

  // Auth Actions
  const loginAcademic = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^@]+@[^@]+\.edu\.br$/.test(cleanEmail)) {
      setAuthError('Acesso exclusivo para e-mails institucionais (.edu.br).');
      return false;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      await cred.user.reload();
      if (!cred.user.emailVerified) {
        setVerifiedTokenReady(false);
        setPendingVerificationEmail(cred.user.email || cleanEmail);
        setAuthError(
          'Confirme o link enviado para o seu e-mail .edu.br antes de acessar.'
        );
        return false;
      }
      await cred.user.getIdToken(true);
      setPendingVerificationEmail(null);
      await ensureSalvadorCampusesSeeded();
      await ensureUserProfileDocs(cred.user);
      setFirebaseUser(cred.user);
      setVerifiedTokenReady(true);
      setAuthRefreshTick((t) => t + 1);
      navigateTo('home');
      return true;
    } catch (err) {
      setAuthError(mapAuthErrorToPtBr(err));
      return false;
    }
  };

  const signUpAcademic = async (
    input: SignUpInput
  ): Promise<{ ok: boolean; needsVerification?: boolean; error?: string }> => {
    setAuthError(null);
    const cleanEmail = input.email.trim().toLowerCase();
    if (!/^[^@]+@[^@]+\.edu\.br$/.test(cleanEmail)) {
      return {
        ok: false,
        error: 'Somente e-mails acadêmicos com domínio .edu.br são aceitos.',
      };
    }
    if (!input.lgpdAccepted) {
      return {
        ok: false,
        error: 'É necessário concordar com os Termos de Uso e Política de Privacidade (LGPD).',
      };
    }

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        input.password
      );
      await updateProfile(cred.user, {
        displayName: input.fullName.trim().slice(0, 80),
      });
      localStorage.setItem(
        `${PENDING_SIGNUP_PREFIX}${cred.user.uid}`,
        JSON.stringify(input)
      );
      await sendEmailVerification(cred.user);
      setPendingVerificationEmail(cleanEmail);
      return { ok: true, needsVerification: true };
    } catch (err) {
      const msg = mapAuthErrorToPtBr(err);
      return { ok: false, error: msg };
    }
  };

  const resendVerificationEmail = async (): Promise<string> => {
    if (!auth.currentUser) {
      return 'Faça login novamente para reenviar o e-mail de verificação.';
    }
    try {
      await sendEmailVerification(auth.currentUser);
      return 'Novo link de verificação enviado para seu e-mail institucional.';
    } catch (err) {
      return mapAuthErrorToPtBr(err);
    }
  };

  const checkEmailVerifiedNow = async (): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setAuthError('Sessão expirada. Faça login novamente para verificar seu e-mail.');
      return false;
    }
    setAuthError(null);
    try {
      await currentUser.reload();
      if (!currentUser.emailVerified) {
        setVerifiedTokenReady(false);
        setAuthError(
          'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam.'
        );
        return false;
      }

      // Force-refresh ID token so Firestore rules receive email_verified: true
      await currentUser.getIdToken(true);

      setPendingVerificationEmail(null);
      await ensureSalvadorCampusesSeeded();
      await ensureUserProfileDocs(currentUser);
      setFirebaseUser(currentUser);
      setVerifiedTokenReady(true);
      setAuthRefreshTick((t) => t + 1);
      navigateTo('home');
      return true;
    } catch (err) {
      console.error('Erro durante verificação de e-mail:', err);
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Missing or insufficient permissions')) {
        setAuthError(
          'Não foi possível acessar seu perfil no Firestore. Tente sair e entrar novamente.'
        );
      } else {
        setAuthError(mapAuthErrorToPtBr(err));
      }
      return false;
    }
  };

  const resetPasswordAcademic = async (
    email: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^@]+@[^@]+\.edu\.br$/.test(cleanEmail)) {
      return {
        ok: false,
        error: 'Informe um e-mail institucional válido terminado em .edu.br.',
      };
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapAuthErrorToPtBr(err) };
    }
  };

  const logoutAcademic = async (): Promise<void> => {
    await signOut(auth);
    setSelectedGroupId(null);
    setActiveFilter('Todas');
    setRawGroups([]);
    setShowAdminView(false);
    setHistory(['welcome', 'login']);
    setCurrentScreen('login');
  };

  const updateUserPreferences = async (updates: {
    destinationLabel?: string;
    destinationLat?: number;
    destinationLng?: number;
    destinationLocation?: GeoLocation | null;
    classEndTime?: string;
    campusId?: string;
    courseInfo?: string;
    phone?: string;
  }) => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;

    const uid = firebaseUser.uid;
    const publicUpdate: Record<string, unknown> = { updatedAt: serverTimestamp() };
    const privateUpdate: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (updates.campusId) {
      publicUpdate.campusId = updates.campusId;
      setCampusId(updates.campusId);
    }
    if (updates.courseInfo) {
      publicUpdate.courseInfo = updates.courseInfo.slice(0, 120);
    }
    if (updates.destinationLabel) {
      const resolved = resolveSalvadorDestination(updates.destinationLabel);
      const lat = updates.destinationLat ?? resolved.lat;
      const lng = updates.destinationLng ?? resolved.lng;
      privateUpdate.defaultDestinationLabel = updates.destinationLabel.slice(0, 140);
      privateUpdate.defaultDestinationLat = lat;
      privateUpdate.defaultDestinationLng = lng;
      setDestination(updates.destinationLabel);
      setDestinationCoords({ lat, lng });
    }
    if (updates.classEndTime) {
      privateUpdate.defaultClassEndTime = updates.classEndTime;
      setClassEndTimeState(updates.classEndTime);
    }
    if (updates.phone !== undefined) {
      privateUpdate.phone = updates.phone.slice(0, 24);
    }

    if (Object.keys(publicUpdate).length > 1) {
      try {
        await updateDoc(doc(db, 'users', uid), publicUpdate);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    }
    if (Object.keys(privateUpdate).length > 1) {
      try {
        await updateDoc(doc(db, 'users', uid, 'private', 'info'), privateUpdate);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/info`);
      }
    }
  };

  const setDestinationWithCoords = (
    label: string,
    lat?: number,
    lng?: number,
    location?: GeoLocation | null
  ) => {
    const resolved = resolveSalvadorDestination(label);
    const finalLat = lat ?? location?.lat ?? resolved.lat;
    const finalLng = lng ?? location?.lng ?? resolved.lng;
    const finalLocation: GeoLocation = location || {
      name: extractShortDestination(label),
      label,
      formattedAddress: label,
      city: 'Salvador',
      lat: finalLat,
      lng: finalLng,
    };

    setDestination(label);
    setDestinationCoords({ lat: finalLat, lng: finalLng });
    setDestinationLocationState(finalLocation);

    if (isAuthenticated) {
      void updateUserPreferences({
        destinationLabel: label,
        destinationLat: finalLat,
        destinationLng: finalLng,
        destinationLocation: finalLocation,
      });
    }
  };

  const setDestinationLocation = (location: GeoLocation) => {
    setDestinationLocationState(location);
    setDestinationWithCoords(
      location.name || location.label,
      location.lat,
      location.lng,
      location
    );
  };

  const setClassEndTime = (time: string) => {
    setClassEndTimeState(time);
    if (isAuthenticated) {
      void updateUserPreferences({ classEndTime: time });
    }
  };

  const exportMyLgpdData = (): string => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        account: userProfile,
        currentPreferences: {
          campus: currentCampus.name,
          destination,
          destinationCoords,
          classEndTime,
        },
      },
      null,
      2
    );
  };

  const deleteMyAccountData = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', uid, 'private', 'info'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/private/info`);
    }
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
    }
    try {
      await deleteUser(auth.currentUser);
    } catch {
      await signOut(auth);
    }
    setHistory(['welcome', 'login']);
    setCurrentScreen('login');
  };

  // Group actions
  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const target = groups.find((g) => g.id === groupId);
    if (target) {
      setSelectedMode(target.mode);
    }
  };

  const createGroup = async (
    input: CreateGroupInput
  ): Promise<{ ok: boolean; groupId?: string; error?: string }> => {
    if (!firebaseUser || !firebaseUser.emailVerified || !userProfile) {
      return { ok: false, error: 'Faça login com seu e-mail .edu.br verificado.' };
    }
    if (userProfile.moderationStatus !== 'active') {
      return {
        ok: false,
        error: 'Sua conta está temporariamente restrita pela moderação.',
      };
    }

    const campus = getCampusById(userProfile.campusId);
    if (
      !isInsideCampusGeofence(
        { lat: input.meetingLat, lng: input.meetingLng },
        campus
      )
    ) {
      return {
        ok: false,
        error:
          'O ponto de encontro deve estar localizado dentro do perímetro do seu campus.',
      };
    }

    const requiresPayment =
      input.mode === 'racha' || (input.mode === 'carona' && input.caronaIsPaid);

    if (requiresPayment && (!input.totalCost || input.totalCost <= 0)) {
      return { ok: false, error: 'Informe o valor total válido para divisão.' };
    }
    if (requiresPayment && !input.leaderPixKey.trim()) {
      return {
        ok: false,
        error: 'Informe uma chave Pix para gerar o código PIX Copia e Cola.',
      };
    }

    const title =
      input.mode === 'bando'
        ? 'Caminhada em Bando'
        : input.mode === 'racha'
        ? 'Racha de App'
        : 'Carona Amiga';

    const distMeters = Math.round(
      haversineDistanceMeters(
        { lat: campus.centerLat, lng: campus.centerLng },
        { lat: input.destinationLat, lng: input.destinationLng }
      ) * 1.25
    );
    const etaMin =
      input.mode === 'bando'
        ? Math.max(8, Math.round(distMeters / 80))
        : Math.max(6, Math.round(distMeters / 520));
    const estimatedArrival = addMinutesToHHMM(input.departureTime, etaMin);
    const scheduledAtMs = computeTodayScheduledMs(input.departureTime);

    const groupRef = doc(collection(db, 'groups'));
    const groupId = groupRef.id;
    const batch = writeBatch(db);

    batch.set(groupRef, {
      campusId: campus.id,
      leaderId: firebaseUser.uid,
      mode: input.mode,
      status: 'open',
      title,
      departureTime: input.departureTime,
      estimatedArrival,
      meetingPoint: input.meetingPoint.slice(0, 100),
      meetingLat: input.meetingLat,
      meetingLng: input.meetingLng,
      destinationLabel: input.destinationLabel.slice(0, 140),
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
      maxSpots: Math.min(6, Math.max(2, input.maxSpots)),
      memberIds: [firebaseUser.uid],
      requiresPayment,
      totalCost: requiresPayment ? Number(input.totalCost.toFixed(2)) : 0,
      recalcVersion: 1,
      scheduledAtMs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'groups', groupId, 'members', firebaseUser.uid), {
      uid: firebaseUser.uid,
      name: userProfile.displayName,
      courseInfo: userProfile.courseInfo,
      role: 'leader',
      acceptedRecalcVersion: 1,
      joinedAt: serverTimestamp(),
    });

    if (requiresPayment) {
      const share = Number((input.totalCost / Math.max(2, input.maxSpots)).toFixed(2));
      const emvTemplate = buildPixCopiaECola({
        pixKey: input.leaderPixKey,
        merchantName: userProfile.displayName,
        merchantCity: 'SALVADOR',
        amount: share,
        txId: `BJ${groupId.slice(0, 10)}`,
      });
      batch.set(doc(db, 'groups', groupId, 'payments', firebaseUser.uid), {
        uid: firebaseUser.uid,
        leaderId: firebaseUser.uid,
        amountDue: share,
        pixPayload: emvTemplate,
        confirmationMethod: 'visual_leader',
        paymentConfirmed: true,
        confirmedByLeaderId: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      setCampusId(campus.id);
      setSelectedGroupId(groupId);
      setSelectedMode(input.mode);
      return { ok: true, groupId };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `groups/${groupId}`);
    }
  };

  const joinSelectedGroup = async (): Promise<'split-pix' | 'ride-active' | null> => {
    if (!firebaseUser || !firebaseUser.emailVerified || !userProfile || !selectedGroup) {
      return null;
    }

    const gid = selectedGroup.id;
    const uid = firebaseUser.uid;

    // Creator or already-joined member: never re-join as external participant; route to management/active screen
    if (selectedGroup.leaderId === uid || selectedGroup.memberIds.includes(uid)) {
      if (
        selectedGroup.requiresPayment &&
        selectedGroup.status !== 'in_progress' &&
        selectedGroup.status !== 'completed'
      ) {
        navigateTo('split-pix');
        return 'split-pix';
      }
      navigateTo('ride-active');
      return 'ride-active';
    }

    if (userProfile.moderationStatus !== 'active') {
      setAuthError('Conta restrita pela moderação não pode ingressar em novos grupos.');
      return null;
    }

    // Grab leader payment template if paid group
    let templatePayload = '';
    if (selectedGroup.requiresPayment) {
      try {
        const leaderPaySnap = await getDoc(
          doc(db, 'groups', gid, 'payments', selectedGroup.leaderId)
        );
        if (leaderPaySnap.exists()) {
          templatePayload = String(leaderPaySnap.data().pixPayload || '');
        }
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.GET,
          `groups/${gid}/payments/${selectedGroup.leaderId}`
        );
      }
    }

    const groupRef = doc(db, 'groups', gid);
    const memberRef = doc(db, 'groups', gid, 'members', uid);
    const paymentRef = doc(db, 'groups', gid, 'payments', uid);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(groupRef);
        if (!snap.exists()) {
          throw new Error('Grupo não encontrado.');
        }
        const data = snap.data();
        const currentIds = Array.isArray(data.memberIds)
          ? (data.memberIds as string[])
          : [];
        const maxSpots = Number(data.maxSpots || 4);
        const status = String(data.status || 'open');

        if (data.leaderId === uid || currentIds.includes(uid)) {
          return;
        }
        if (status !== 'open' || currentIds.length >= maxSpots) {
          throw new Error('Este grupo não possui mais vagas abertas.');
        }

        const nextIds = [...currentIds, uid];
        const nextStatus = nextIds.length >= maxSpots ? 'full' : 'open';
        const recalcVersion = Number(data.recalcVersion || 1);

        tx.update(groupRef, {
          memberIds: nextIds,
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });

        tx.set(memberRef, {
          uid,
          name: userProfile.displayName,
          courseInfo: userProfile.courseInfo,
          role: 'member',
          acceptedRecalcVersion: recalcVersion,
          joinedAt: serverTimestamp(),
        });

        if (Boolean(data.requiresPayment)) {
          const totalCost = Number(data.totalCost || 0);
          const share = Number((totalCost / Math.max(1, maxSpots)).toFixed(2));
          const pixPayload = repricePixCopiaECola(templatePayload, share);
          tx.set(paymentRef, {
            uid,
            leaderId: String(data.leaderId || ''),
            amountDue: share,
            pixPayload,
            confirmationMethod: 'pending',
            paymentConfirmed: false,
            updatedAt: serverTimestamp(),
          });
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('vagas') || err.message.includes('encontrado'))) {
        setAuthError(err.message);
        return null;
      }
      handleFirestoreError(err, OperationType.WRITE, `groups/${gid}`);
    }

    if (selectedGroup.requiresPayment) {
      navigateTo('split-pix');
      return 'split-pix';
    }
    navigateTo('ride-active');
    return 'ride-active';
  };

  const leaveGroup = async (groupId: string) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const groupRef = doc(db, 'groups', groupId);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(groupRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const currentIds = (data.memberIds as string[]) || [];
        if (!currentIds.includes(uid) || data.leaderId === uid) return;
        const nextIds = currentIds.filter((id) => id !== uid);
        tx.update(groupRef, {
          memberIds: nextIds,
          status: 'open',
          updatedAt: serverTimestamp(),
        });
        tx.delete(doc(db, 'groups', groupId, 'members', uid));
      });
      navigateTo('groups');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `groups/${groupId}`);
    }
  };

  const submitReceiptUpload = async (
    groupId: string,
    file: File
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!firebaseUser) return { ok: false, error: 'Sessão expirada.' };
    try {
      const dataUrl = await compressReceiptImage(file);
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(); // RNF01: 7-day retention

      const payRef = doc(db, 'groups', groupId, 'payments', firebaseUser.uid);
      await updateDoc(payRef, {
        confirmationMethod: 'receipt_upload',
        receiptPreviewDataUrl: dataUrl,
        receiptExpiresAt: expiresAt,
        paymentConfirmed: true,
        updatedAt: serverTimestamp(),
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof Error && err.message.includes('imagem')) {
        return { ok: false, error: err.message };
      }
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `groups/${groupId}/payments/${firebaseUser.uid}`
      );
    }
  };

  const confirmMemberPaymentVisual = async (groupId: string, memberUid: string) => {
    if (!firebaseUser) return;
    const payRef = doc(db, 'groups', groupId, 'payments', memberUid);
    try {
      await updateDoc(payRef, {
        confirmationMethod: 'visual_leader',
        paymentConfirmed: true,
        confirmedByLeaderId: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `groups/${groupId}/payments/${memberUid}`
      );
    }
  };

  const startGroupRide = async (
    groupId: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!firebaseUser) return { ok: false, error: 'Não autenticado.' };
    const group = groups.find((g) => g.id === groupId);
    if (!group) return { ok: false, error: 'Grupo não encontrado.' };
    if (group.leaderId !== firebaseUser.uid) {
      return { ok: false, error: 'Apenas o líder pode iniciar a corrida.' };
    }

    // RF10: Check all present members accepted latest recalculation
    const pendingRecalc = group.members.some(
      (m) => m.acceptedRecalcVersion < group.recalcVersion
    );
    if (pendingRecalc) {
      return {
        ok: false,
        error:
          'Aguardando que todos os integrantes aceitem o novo valor recalculado antes de iniciar.',
      };
    }

    // RF08: Block ride start until all present members have paymentConfirmed === true
    if (group.requiresPayment) {
      const unconfirmed = group.memberIds.filter(
        (uid) => !group.paymentsByUid[uid]?.paymentConfirmed
      );
      if (unconfirmed.length > 0) {
        return {
          ok: false,
          error:
            'Início bloqueado (RF08): todos os participantes precisam ter o pagamento confirmado pelo comprovante ou pelo líder.',
        };
      }
    }

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        status: 'in_progress',
        updatedAt: serverTimestamp(),
      });
      return { ok: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

  // RF09 & RF10: Remove member after 10-minute tolerance and recalculate split
  const removeAbsentMemberWithRecalc = async (
    groupId: string,
    targetUid: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!firebaseUser) return { ok: false, error: 'Não autenticado.' };
    const group = groups.find((g) => g.id === groupId);
    if (!group) return { ok: false, error: 'Grupo não encontrado.' };
    if (group.leaderId !== firebaseUser.uid) {
      return { ok: false, error: 'Apenas o líder pode remover integrantes.' };
    }
    if (targetUid === group.leaderId) {
      return { ok: false, error: 'O líder não pode ser removido desta forma.' };
    }

    const toleranceDeadline = group.scheduledAtMs + 10 * 60 * 1000;
    if (Date.now() < toleranceDeadline) {
      const remainingMin = Math.ceil((toleranceDeadline - Date.now()) / 60000);
      return {
        ok: false,
        error: `A tolerância de 10 minutos após o horário previsto (${group.departureTime}) ainda está em vigor. Faltam ${remainingMin} min.`,
      };
    }

    const remainingIds = group.memberIds.filter((id) => id !== targetUid);
    if (remainingIds.length < 1) {
      return { ok: false, error: 'Não há outros integrantes para manter o grupo.' };
    }

    const nextRecalcVersion = group.recalcVersion + 1;
    const newShare =
      group.requiresPayment && group.totalCost > 0
        ? Number((group.totalCost / remainingIds.length).toFixed(2))
        : 0;

    const batch = writeBatch(db);
    batch.update(doc(db, 'groups', groupId), {
      memberIds: remainingIds,
      maxSpots: remainingIds.length,
      status: remainingIds.length >= 2 ? 'full' : 'open',
      recalcVersion: nextRecalcVersion,
      updatedAt: serverTimestamp(),
    });
    batch.delete(doc(db, 'groups', groupId, 'members', targetUid));

    if (group.requiresPayment) {
      batch.delete(doc(db, 'groups', groupId, 'payments', targetUid));
      const basePix =
        group.paymentsByUid[group.leaderId]?.pixPayload ||
        Object.values(group.paymentsByUid)[0]?.pixPayload ||
        '';
      const updatedPixPayload = repricePixCopiaECola(basePix, newShare);

      for (const remUid of remainingIds) {
        const payDoc = group.paymentsByUid[remUid];
        if (!payDoc) continue;
        batch.update(doc(db, 'groups', groupId, 'payments', remUid), {
          amountDue: newShare,
          pixPayload: updatedPixPayload,
          updatedAt: serverTimestamp(),
        });
      }
    }

    try {
      await batch.commit();
      return { ok: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `groups/${groupId}`);
    }
  };

  const acceptRecalculation = async (groupId: string) => {
    if (!firebaseUser) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    try {
      await updateDoc(doc(db, 'groups', groupId, 'members', firebaseUser.uid), {
        acceptedRecalcVersion: group.recalcVersion,
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `groups/${groupId}/members/${firebaseUser.uid}`
      );
    }
  };

  const completeGroupRide = async (groupId: string) => {
    if (!firebaseUser) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'groups', groupId), {
      status: 'completed',
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'groups', groupId, 'liveLocations', firebaseUser.uid),
      {
        uid: firebaseUser.uid,
        lat: destinationCoords.lat,
        lng: destinationCoords.lng,
        sharingEnabled: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    try {
      await batch.commit();
      setGpsStatus('inactive');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `groups/${groupId}`);
    }
  };

  const currentChatMessages = activeRideGroup
    ? chatByGroupId[activeRideGroup.id] || []
    : [];
  const unreadMessagesCount = activeRideGroup
    ? unreadByGroup[activeRideGroup.id] || 0
    : 0;

  const markChatRead = () => {
    if (!activeRideGroup) return;
    setUnreadByGroup((prev) => ({ ...prev, [activeRideGroup.id]: 0 }));
  };

  const sendChatMessage = async (text: string) => {
    if (!firebaseUser || !userProfile || !activeRideGroup) return;
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    try {
      await addDoc(collection(db, 'groups', activeRideGroup.id, 'messages'), {
        senderId: firebaseUser.uid,
        senderName: userProfile.displayName,
        text: trimmed,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `groups/${activeRideGroup.id}/messages`
      );
    }
  };

  const submitPostTripRating = async (
    groupId: string,
    score: number,
    safetyOk: boolean,
    comment: string
  ) => {
    if (!firebaseUser) return;
    try {
      await addDoc(collection(db, 'ratings'), {
        groupId,
        fromUid: firebaseUser.uid,
        score: Math.min(5, Math.max(1, score)),
        safetyOk,
        comment: comment.trim().slice(0, 500),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ratings');
    }
  };

  const submitReport = async (params: {
    groupId: string;
    reportedUid: string;
    reportedName: string;
    category: ReportCategory;
    description: string;
  }) => {
    if (!firebaseUser || !userProfile) return;
    const priority =
      params.category === 'immediate_risk' ? 'immediate_risk' : 'normal';
    const slaDeadlineAt = computeBusinessSlaDeadlineIso(Date.now(), 24);
    try {
      await addDoc(collection(db, 'reports'), {
        groupId: params.groupId,
        reporterUid: firebaseUser.uid,
        reporterName: userProfile.displayName,
        reportedUid: params.reportedUid,
        reportedName: params.reportedName.slice(0, 80),
        category: params.category,
        priority,
        description: params.description.trim().slice(0, 1000),
        status: 'pendente',
        slaDeadlineAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reports');
    }
  };

  const contestModerationReport = async (
    reportId: string,
    contestNote: string
  ) => {
    if (!firebaseUser) return;
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        contestNote: contestNote.trim().slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const value: BoraJuntoContextValue = {
    currentScreen,
    history,
    theme,
    setTheme,
    navigateTo,
    jumpToScreen,
    goBack,
    showAdminView,
    setShowAdminView,
    authReady,
    firebaseUser,
    pendingVerificationEmail,
    isAuthenticated,
    isAdmin: Boolean(userProfile?.isAdmin),
    userProfile,
    userName: userProfile?.displayName || 'Estudante',
    userEmail: userProfile?.email || firebaseUser?.email || '',
    authError,
    clearAuthError: () => setAuthError(null),
    loginAcademic,
    signUpAcademic,
    resendVerificationEmail,
    checkEmailVerifiedNow,
    resetPasswordAcademic,
    logoutAcademic,
    updateUserPreferences,
    exportMyLgpdData,
    deleteMyAccountData,
    currentCampus,
    destination,
    destinationShort: extractShortDestination(destination),
    destinationCoords,
    destinationLocation,
    setDestinationWithCoords,
    setDestinationLocation,
    classEndTime,
    setClassEndTime,
    selectedMode,
    setSelectedMode,
    activeFilter,
    setActiveFilter,
    groups,
    myCreatedGroups,
    filteredGroups,
    selectedGroup,
    selectGroup,
    joinedGroupId,
    activeRideGroup,
    createGroup,
    joinSelectedGroup,
    leaveGroup,
    submitReceiptUpload,
    confirmMemberPaymentVisual,
    startGroupRide,
    removeAbsentMemberWithRecalc,
    acceptRecalculation,
    completeGroupRide,
    chatMessages: currentChatMessages,
    unreadMessagesCount,
    markChatRead,
    sendChatMessage,
    gpsStatus,
    myReportsAgainstMe,
    submitPostTripRating,
    submitReport,
    contestModerationReport,
  };

  return (
    <BoraJuntoContext.Provider value={value}>
      {children}
    </BoraJuntoContext.Provider>
  );
};

export function useBoraJunto(): BoraJuntoContextValue {
  const ctx = useContext(BoraJuntoContext);
  if (!ctx) {
    throw new Error('useBoraJunto must be used within BoraJuntoProvider');
  }
  return ctx;
}
