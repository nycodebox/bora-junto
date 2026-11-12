import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  INITIAL_USER,
  MOCK_GROUPS,
  extractShortDestination,
} from '../data/mockData';
import {
  ChatMessage,
  GroupFilter,
  RideGroup,
  ScreenId,
  ThemeMode,
  TransportMode,
} from '../types';

interface BoraJuntoContextValue {
  // Navigation & Theme
  currentScreen: ScreenId;
  history: ScreenId[];
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  navigateTo: (screen: ScreenId) => void;
  jumpToScreen: (screen: ScreenId) => void;
  goBack: () => void;

  // Simulated User / Auth
  userName: string;
  userEmail: string;
  isAuthenticated: boolean;
  loginSimulated: (email: string) => void;
  logoutSimulated: () => void;

  // Trip Configuration (Home)
  destination: string;
  destinationShort: string;
  setDestination: (dest: string) => void;
  classEndTime: string;
  setClassEndTime: (time: string) => void;
  selectedMode: TransportMode;
  setSelectedMode: (mode: TransportMode) => void;

  // Groups & Selection
  activeFilter: GroupFilter;
  setActiveFilter: (filter: GroupFilter) => void;
  groups: RideGroup[];
  filteredGroups: RideGroup[];
  selectedGroup: RideGroup;
  selectGroup: (groupId: string) => void;
  joinedGroupId: string | null;
  joinSelectedGroup: () => 'split-pix' | 'ride-active';
  activeRideGroup: RideGroup;

  // Ride & Chat
  rideStatus: 'Em andamento' | 'Aguardando saída';
  chatMessages: ChatMessage[];
  unreadMessagesCount: number;
  markChatRead: () => void;
  sendChatMessage: (text: string) => void;
}

const BoraJuntoContext = createContext<BoraJuntoContextValue | null>(null);

export const BoraJuntoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [history, setHistory] = useState<ScreenId[]>(['welcome']);
  const [theme, setTheme] = useState<ThemeMode>('light');

  const [userName, setUserName] = useState<string>(INITIAL_USER.name);
  const [userEmail, setUserEmail] = useState<string>(INITIAL_USER.email);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [destination, setDestination] = useState<string>('Saúde, São Paulo');
  const [classEndTime, setClassEndTime] = useState<string>('22:30');
  const [selectedMode, setSelectedMode] = useState<TransportMode>('racha');

  const [activeFilter, setActiveFilter] = useState<GroupFilter>('Todas');
  const [groups, setGroups] = useState<RideGroup[]>(MOCK_GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('racha-app');
  const [joinedGroupId, setJoinedGroupId] = useState<string | null>(null);

  const [chatByGroup, setChatByGroup] = useState<Record<string, ChatMessage[]>>(() => {
    const initial: Record<string, ChatMessage[]> = {};
    for (const g of MOCK_GROUPS) {
      initial[g.id] = g.initialMessages;
    }
    return initial;
  });
  const [unreadByGroup, setUnreadByGroup] = useState<Record<string, number>>({
    'racha-app': 2,
    'caminhada-bando': 2,
    'carona-amiga': 2,
  });

  const navigateTo = (screen: ScreenId) => {
    if (screen === currentScreen) return;
    setHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
  };

  const jumpToScreen = (screen: ScreenId) => {
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
  };

  const goBack = () => {
    setHistory((prev) => {
      if (prev.length <= 1) {
        setCurrentScreen('home');
        return ['home'];
      }
      const nextHistory = prev.slice(0, -1);
      setCurrentScreen(nextHistory[nextHistory.length - 1]);
      return nextHistory;
    });
  };

  const loginSimulated = (email: string) => {
    const cleanEmail = email.trim();
    const localPart = cleanEmail.split('@')[0] || 'Ana';
    const firstWord = localPart.split(/[._-]/)[0] || 'Ana';
    const formattedName =
      firstWord.toLowerCase() === 'voce'
        ? 'Ana'
        : firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();

    setUserEmail(cleanEmail);
    setUserName(formattedName || 'Ana');
    setIsAuthenticated(true);
    navigateTo('home');
  };

  const logoutSimulated = () => {
    setIsAuthenticated(false);
    setJoinedGroupId(null);
    setHistory(['welcome', 'login']);
    setCurrentScreen('login');
  };

  const filteredGroups = useMemo(() => {
    if (activeFilter === 'Todas') return groups;
    if (activeFilter === 'A pé') return groups.filter((g) => g.mode === 'bando');
    if (activeFilter === 'App') return groups.filter((g) => g.mode === 'racha');
    return groups.filter((g) => g.mode === 'carona');
  }, [activeFilter, groups]);

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || groups[0];
  }, [groups, selectedGroupId]);

  const activeRideGroup = useMemo(() => {
    if (joinedGroupId) {
      return groups.find((g) => g.id === joinedGroupId) || selectedGroup;
    }
    return selectedGroup;
  }, [groups, joinedGroupId, selectedGroup]);

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const target = groups.find((g) => g.id === groupId);
    if (target) {
      setSelectedMode(target.mode);
    }
  };

  const joinSelectedGroup = (): 'split-pix' | 'ride-active' => {
    const target = selectedGroup;
    setJoinedGroupId(target.id);

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== target.id) return g;
        const alreadyIn = g.members.some((m) => m.id === 'current-user');
        if (alreadyIn || g.members.length >= g.totalSpots) return g;
        return {
          ...g,
          members: [
            ...g.members,
            {
              id: 'current-user',
              name: userName === 'Ana' ? 'Ana' : userName,
              courseInfo: `Acadêmica · aula até ${classEndTime}`,
              roleBadge: 'Verificada',
              badgeVariant: 'green',
            },
          ],
        };
      })
    );

    if (target.mode === 'racha') {
      navigateTo('split-pix');
      return 'split-pix';
    }
    navigateTo('ride-active');
    return 'ride-active';
  };

  const currentChatMessages = chatByGroup[activeRideGroup.id] || [];
  const unreadMessagesCount = unreadByGroup[activeRideGroup.id] ?? 0;

  const markChatRead = () => {
    setUnreadByGroup((prev) => ({
      ...prev,
      [activeRideGroup.id]: 0,
    }));
  };

  const sendChatMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: userName,
      text: trimmed,
      time: '22:43',
      isMe: true,
    };
    setChatByGroup((prev) => ({
      ...prev,
      [activeRideGroup.id]: [...(prev[activeRideGroup.id] || []), newMsg],
    }));
  };

  const value: BoraJuntoContextValue = {
    currentScreen,
    history,
    theme,
    setTheme,
    navigateTo,
    jumpToScreen,
    goBack,
    userName,
    userEmail,
    isAuthenticated,
    loginSimulated,
    logoutSimulated,
    destination,
    destinationShort: extractShortDestination(destination),
    setDestination,
    classEndTime,
    setClassEndTime,
    selectedMode,
    setSelectedMode,
    activeFilter,
    setActiveFilter,
    groups,
    filteredGroups,
    selectedGroup,
    selectGroup,
    joinedGroupId,
    joinSelectedGroup,
    activeRideGroup,
    rideStatus: 'Em andamento',
    chatMessages: currentChatMessages,
    unreadMessagesCount,
    markChatRead,
    sendChatMessage,
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
