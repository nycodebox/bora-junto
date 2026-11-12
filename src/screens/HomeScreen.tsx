import React, { useState } from 'react';
import { ChevronRight, Clock, Home, LogOut, MapPin, ShieldCheck, Users } from 'lucide-react';
import { BottomTabBar, BrandHeader, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { CarFrontIcon, PrimaryButton, StatusBadge, WalkingIcon } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import {
  CAMPUS_HEADER,
  CAMPUS_ORIGIN,
  CLASS_END_TIME_OPTIONS,
  DESTINATION_OPTIONS,
} from '../data/mockData';
import { TransportMode } from '../types';

export const HomeScreen: React.FC = () => {
  const {
    userName,
    userEmail,
    destination,
    setDestination,
    classEndTime,
    setClassEndTime,
    selectedMode,
    setSelectedMode,
    navigateTo,
    logoutSimulated,
  } = useBoraJunto();

  const [activeModal, setActiveModal] = useState<
    null | 'destination' | 'time' | 'notifications' | 'profile'
  >(null);
  const [draftDestination, setDraftDestination] = useState(destination);
  const [draftTime, setDraftTime] = useState(classEndTime);

  const modes: Array<{
    id: TransportMode;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'bando',
      title: 'Em bando',
      subtitle: 'Gratuito',
      icon: <WalkingIcon className="w-[23px] h-[23px]" />,
    },
    {
      id: 'racha',
      title: 'Racha de App',
      subtitle: 'Divida a corrida',
      icon: <CarFrontIcon className="w-[23px] h-[23px]" />,
    },
    {
      id: 'carona',
      title: 'Carona',
      subtitle: 'Entre colegas',
      icon: <Users className="w-[22px] h-[22px]" strokeWidth={1.85} />,
    },
  ];

  const openDestinationModal = () => {
    setDraftDestination(destination);
    setActiveModal('destination');
  };

  const openTimeModal = () => {
    setDraftTime(classEndTime);
    setActiveModal('time');
  };

  const handleConfirmDestination = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draftDestination.trim();
    if (clean) {
      setDestination(clean);
    }
    setActiveModal(null);
  };

  const handleConfirmTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftTime.trim()) {
      setClassEndTime(draftTime.trim());
    }
    setActiveModal(null);
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:15" />
        <BrandHeader
          rightIcon="bell"
          onRightClick={() => setActiveModal('notifications')}
        />

        <div className="px-6 pt-1 pb-4 flex-1 flex flex-col">
          <h1 className="text-[27px] leading-[1.18] font-bold tracking-[-0.025em] text-[#102536] dark:text-white">
            Bora pra casa, {userName}?
          </h1>
          <p className="text-[14.5px] text-[#596579] dark:text-[#A8B3C7] mt-1 mb-5">
            Encontre companhia para a volta de hoje.
          </p>

          {/* Main Trip Configuration Card */}
          <div className="rounded-[24px] bg-white dark:bg-[#1E2230] p-[18px] figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] mb-6">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[11.5px] font-bold tracking-[0.05em] uppercase text-[#596579] dark:text-[#A8B3C7]">
                {CAMPUS_HEADER}
              </span>
              <ShieldCheck
                className="w-[20px] h-[20px] text-[#137A59] dark:text-[#4ADE80]"
                strokeWidth={2}
              />
            </div>

            {/* Origin (fixed campus per RF14) */}
            <div className="flex items-center gap-3.5">
              <MapPin
                className="w-[20px] h-[20px] text-[#596579] dark:text-[#94A3B8] shrink-0"
                strokeWidth={1.85}
              />
              <div>
                <p className="text-[12px] text-[#596579] dark:text-[#94A3B8]">
                  Saindo do seu campus
                </p>
                <p className="text-[15.5px] font-bold text-[#102536] dark:text-white mt-0.5">
                  {CAMPUS_ORIGIN}
                </p>
              </div>
            </div>

            <div className="h-px bg-[#E8EDF3] dark:bg-[#2C3245] my-3.5" />

            {/* Destination (editable) */}
            <button
              type="button"
              onClick={openDestinationModal}
              className="w-full text-left flex items-center justify-between gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Home
                  className="w-[20px] h-[20px] text-[#596579] dark:text-[#94A3B8] shrink-0"
                  strokeWidth={1.85}
                />
                <div className="min-w-0">
                  <p className="text-[12px] text-[#596579] dark:text-[#94A3B8]">
                    Seu destino
                  </p>
                  <p className="text-[15.5px] font-bold text-[#102536] dark:text-white mt-0.5 truncate">
                    {destination}
                  </p>
                </div>
              </div>
              <ChevronRight
                className="w-[18px] h-[18px] text-[#596579] dark:text-[#94A3B8] shrink-0"
                strokeWidth={2}
              />
            </button>

            {/* Class End Time Sub-card */}
            <div className="mt-4 rounded-[16px] bg-[#EEF2F6] dark:bg-[#282E40] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock
                  className="w-[20px] h-[20px] text-[#596579] dark:text-[#94A3B8] shrink-0"
                  strokeWidth={1.85}
                />
                <div>
                  <p className="text-[11.5px] text-[#596579] dark:text-[#A8B3C7]">
                    Minha aula termina às
                  </p>
                  <p className="text-[20px] leading-tight font-bold text-[#102536] dark:text-white tabular-nums mt-0.5">
                    {classEndTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openTimeModal}
                className="text-[13.5px] font-bold text-[#102536] dark:text-white px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Alterar
              </button>
            </div>
          </div>

          {/* Transport Modes */}
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#102536] dark:text-white mb-3.5">
            Como você quer ir?
          </h2>

          <div className="grid grid-cols-3 gap-[10px] mb-4">
            {modes.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`rounded-[18px] px-2 py-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E1F7FC] dark:bg-[#133342] border-[1.75px] border-[#00D2FF]'
                      : 'bg-white dark:bg-[#1E2230] border border-[#EDF1F6] dark:border-[#272D3F] figma-card-shadow'
                  }`}
                >
                  <div className="text-[#102536] dark:text-white mb-2.5">{mode.icon}</div>
                  <span className="text-[13px] font-bold text-[#102536] dark:text-white whitespace-nowrap">
                    {mode.title}
                  </span>
                  <span className="text-[11px] text-[#596579] dark:text-[#A8B3C7] mt-1 whitespace-nowrap">
                    {mode.subtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rule Hint */}
          <div className="flex items-center gap-2.5 mb-5">
            <Users
              className="w-[17px] h-[17px] text-[#596579] dark:text-[#94A3B8] shrink-0"
              strokeWidth={1.85}
            />
            <span className="text-[12px] text-[#596579] dark:text-[#A8B3C7]">
              Destinos até 2 km • aulas com até 15 min de diferença
            </span>
          </div>

          <div className="mt-auto">
            <PrimaryButton onClick={() => navigateTo('groups')}>
              Encontrar meu grupo
            </PrimaryButton>
          </div>
        </div>
      </div>

      <BottomTabBar
        activeTab={activeModal === 'profile' ? 'profile' : 'home'}
        onNavigate={navigateTo}
        onProfileClick={() => setActiveModal('profile')}
      />

      {/* Destination Picker Modal */}
      <ModalSheet
        open={activeModal === 'destination'}
        onClose={() => setActiveModal(null)}
        title="Seu destino"
        subtitle="Escolha ou digite o bairro de destino"
      >
        <form onSubmit={handleConfirmDestination} className="space-y-4">
          <div className="h-[50px] px-4 rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] flex items-center gap-3">
            <Home className="w-[18px] h-[18px] text-[#596579] dark:text-[#94A3B8] shrink-0" />
            <input
              type="text"
              value={draftDestination}
              onChange={(e) => setDraftDestination(e.target.value)}
              placeholder="Ex: Saúde, São Paulo"
              className="w-full bg-transparent text-[14.5px] font-semibold text-[#102536] dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {DESTINATION_OPTIONS.map((opt) => {
              const active = draftDestination === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDraftDestination(opt)}
                  className={`px-3 py-2 rounded-[10px] text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#E1F7FC] dark:bg-[#133342] text-[#102536] dark:text-white border border-[#00D2FF]'
                      : 'bg-[#F8F9FA] dark:bg-[#282E40] text-[#596579] dark:text-[#A8B3C7]'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <PrimaryButton type="submit">Confirmar destino</PrimaryButton>
        </form>
      </ModalSheet>

      {/* Class End Time Picker Modal */}
      <ModalSheet
        open={activeModal === 'time'}
        onClose={() => setActiveModal(null)}
        title="Horário de término da aula"
        subtitle="Compatibilidade de até 15 min entre horários"
      >
        <form onSubmit={handleConfirmTime} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CLASS_END_TIME_OPTIONS.map((t) => {
              const active = draftTime === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraftTime(t)}
                  className={`px-4 py-2 rounded-[10px] text-[13.5px] font-bold tabular-nums transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#E1F7FC] dark:bg-[#133342] text-[#102536] dark:text-white border border-[#00D2FF]'
                      : 'bg-[#EEF2F6] dark:bg-[#282E40] text-[#596579] dark:text-[#CBD5E1]'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="h-[50px] px-4 rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] flex items-center justify-between">
            <span className="text-[13.5px] font-medium text-[#596579] dark:text-[#A8B3C7]">
              Outro horário
            </span>
            <input
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              className="bg-transparent text-[15px] font-bold text-[#102536] dark:text-white tabular-nums focus:outline-none"
            />
          </div>

          <PrimaryButton type="submit">Confirmar horário</PrimaryButton>
        </form>
      </ModalSheet>

      {/* Notifications Provisional Modal */}
      <ModalSheet
        open={activeModal === 'notifications'}
        onClose={() => setActiveModal(null)}
        title="Notificações"
        subtitle="Interação provisória de protótipo"
      >
        <p className="text-[14px] leading-[1.5] text-[#596579] dark:text-[#A8B3C7] mb-5">
          O sistema de notificações em tempo real não faz parte desta etapa do protótipo. Alertas sobre entrada de colegas no grupo e avisos de saída aparecerão aqui futuramente.
        </p>
        <PrimaryButton onClick={() => setActiveModal(null)}>Fechar</PrimaryButton>
      </ModalSheet>

      {/* Provisional Profile Modal */}
      <ModalSheet
        open={activeModal === 'profile'}
        onClose={() => setActiveModal(null)}
        title="Perfil acadêmico"
        subtitle="Visualização provisória (sem tela dedicada no protótipo)"
      >
        <div className="rounded-[18px] bg-[#F8F9FA] dark:bg-[#282E40] p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[16px] font-bold text-[#102536] dark:text-white">
              {userName}
            </span>
            <StatusBadge variant="green" className="px-3 py-[5px] rounded-[8px]">
              Verificada
            </StatusBadge>
          </div>
          <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7]">{userEmail}</p>
          <p className="text-[12.5px] font-medium text-[#102536] dark:text-[#CBD5E1]">
            {CAMPUS_ORIGIN} · Destino: {destination}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveModal(null);
            logoutSimulated();
          }}
          className="w-full h-[48px] rounded-[14px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] font-bold text-[14.5px] flex items-center justify-center gap-2 cursor-pointer mb-2"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta simulada
        </button>
      </ModalSheet>
    </div>
  );
};
