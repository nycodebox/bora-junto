import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Download,
  Home,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { BottomTabBar, BrandHeader, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { LocationSearchInput } from '../components/LocationSearchInput';
import {
  CarFrontIcon,
  PrimaryButton,
  StatusBadge,
  WalkingIcon,
} from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import {
  CLASS_END_TIME_OPTIONS,
  SALVADOR_CAMPUSES,
} from '../utils/geo';
import { GeoLocation, TransportMode } from '../types';

export const HomeScreen: React.FC = () => {
  const {
    userName,
    userEmail,
    userProfile,
    isAuthenticated,
    isAdmin,
    setShowAdminView,
    currentCampus,
    destination,
    destinationLocation,
    setDestinationWithCoords,
    classEndTime,
    setClassEndTime,
    selectedMode,
    setSelectedMode,
    navigateTo,
    logoutAcademic,
    updateUserPreferences,
    exportMyLgpdData,
    deleteMyAccountData,
    myReportsAgainstMe,
    contestModerationReport,
  } = useBoraJunto();

  const [activeModal, setActiveModal] = useState<
    null | 'destination' | 'time' | 'notifications' | 'profile' | 'lgpd' | 'contest'
  >(null);
  const [draftDestination, setDraftDestination] = useState(destination);
  const [draftLocation, setDraftLocation] = useState<GeoLocation | null>(destinationLocation);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  const [draftTime, setDraftTime] = useState(classEndTime);
  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contestText, setContestText] = useState('');
  const [contestSent, setContestSent] = useState(false);

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
    setDraftLocation(destinationLocation);
    setDestinationError(null);
    setActiveModal('destination');
  };

  const openTimeModal = () => {
    setDraftTime(classEndTime);
    setActiveModal('time');
  };

  const handleConfirmDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftLocation) {
      setDestinationError(
        'Selecione uma das sugestões da lista para confirmar as coordenadas do destino.'
      );
      return;
    }
    setDestinationError(null);
    setDestinationWithCoords(
      draftLocation.name || draftLocation.label,
      draftLocation.lat,
      draftLocation.lng,
      draftLocation
    );
    setActiveModal(null);
  };

  const handleConfirmTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftTime.trim()) {
      setClassEndTime(draftTime.trim());
    }
    setActiveModal(null);
  };

  const latestModerationReport = myReportsAgainstMe[0];

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

          {userProfile && userProfile.moderationStatus !== 'active' && (
            <button
              type="button"
              onClick={() => setActiveModal('contest')}
              className="mb-3 rounded-[16px] bg-[#FDEAF1] dark:bg-[#3B2034] px-4 py-3 text-left flex items-center gap-3 cursor-pointer"
            >
              <AlertTriangle className="w-5 h-5 text-[#C51557] dark:text-[#FF6A9B] shrink-0" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-[#C51557] dark:text-[#FF6A9B]">
                  Conta com restrição preventiva
                </p>
                <p className="text-[11.5px] text-[#596579] dark:text-[#CBD5E1] truncate">
                  Toque para ver o motivo ou enviar contestação (RF13)
                </p>
              </div>
            </button>
          )}

          {/* Main Trip Configuration Card */}
          <div className="rounded-[24px] bg-white dark:bg-[#1E2230] p-[18px] figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] mb-6">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[11.5px] font-bold tracking-[0.05em] uppercase text-[#596579] dark:text-[#A8B3C7]">
                {currentCampus.headerLabel}
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
                  {currentCampus.name}
                </p>
              </div>
            </div>

            <div className="h-px bg-[#E8EDF3] dark:bg-[#2C3245] my-3.5" />

            {/* Destination (editable + Nominatim Salvador search) */}
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
            <PrimaryButton
              onClick={() => navigateTo(isAuthenticated ? 'groups' : 'login')}
            >
              {isAuthenticated ? 'Encontrar meu grupo' : 'Entrar com .edu.br'}
            </PrimaryButton>
          </div>
        </div>
      </div>

      <BottomTabBar
        activeTab={activeModal === 'profile' ? 'profile' : 'home'}
        onNavigate={navigateTo}
        onProfileClick={() => setActiveModal('profile')}
      />

      {/* Destination Picker Modal with OpenRouteService / Pelias Autocomplete */}
      <ModalSheet
        open={activeModal === 'destination'}
        onClose={() => setActiveModal(null)}
        title="Seu destino"
        subtitle="Pesquise por bairro, rua, ponto de referência ou município"
      >
        <form onSubmit={handleConfirmDestination} className="space-y-4">
          <LocationSearchInput
            placeholder="Ex: Pituba, Paralela, Shopping da Bahia..."
            value={draftDestination}
            selectedLocation={draftLocation}
            onTextChange={(val) => {
              setDraftDestination(val);
              if (destinationError) setDestinationError(null);
              if (
                draftLocation &&
                draftLocation.name !== val &&
                draftLocation.label !== val
              ) {
                setDraftLocation(null);
              }
            }}
            onSelectLocation={(loc) => {
              setDraftLocation(loc);
              setDraftDestination(loc.name || loc.label);
              setDestinationError(null);
            }}
            onClear={() => {
              setDraftDestination('');
              setDraftLocation(null);
              setDestinationError(null);
            }}
            helperText="Digite e selecione explicitamente uma sugestão em Salvador ou RMS."
          />

          {destinationError && (
            <p className="text-[12px] font-semibold text-[#C51557] dark:text-[#FF6A9B] px-1">
              {destinationError}
            </p>
          )}

          <PrimaryButton
            type="submit"
            disabled={!draftLocation}
            className={!draftLocation ? 'opacity-60 cursor-not-allowed' : ''}
          >
            Confirmar destino
          </PrimaryButton>
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

      {/* Notifications Modal */}
      <ModalSheet
        open={activeModal === 'notifications'}
        onClose={() => setActiveModal(null)}
        title="Avisos da comunidade"
        subtitle="Status de verificação e moderação"
      >
        <div className="space-y-2.5 mb-4">
          <div className="rounded-[14px] bg-[#E5F6EF] dark:bg-[#18392F] px-4 py-3">
            <p className="text-[13px] font-bold text-[#137A59] dark:text-[#66DBB1]">
              {isAuthenticated
                ? 'Vínculo acadêmico .edu.br verificado'
                : 'Aguardando login institucional .edu.br'}
            </p>
            <p className="text-[12px] text-[#596579] dark:text-[#A8B3C7] mt-0.5">
              Base geográfica ativa: Salvador / RMS.
            </p>
          </div>
          {latestModerationReport && (
            <button
              type="button"
              onClick={() => setActiveModal('contest')}
              className="w-full text-left rounded-[14px] bg-[#FDEAF1] dark:bg-[#3B2034] px-4 py-3 cursor-pointer"
            >
              <p className="text-[13px] font-bold text-[#C51557] dark:text-[#FF6A9B]">
                Registro de moderação: {latestModerationReport.status}
              </p>
              <p className="text-[12px] text-[#596579] dark:text-[#CBD5E1] mt-0.5">
                Toque para visualizar detalhes ou contestar.
              </p>
            </button>
          )}
        </div>
        <PrimaryButton onClick={() => setActiveModal(null)}>Fechar</PrimaryButton>
      </ModalSheet>

      {/* Academic Profile & LGPD Modal */}
      <ModalSheet
        open={activeModal === 'profile'}
        onClose={() => setActiveModal(null)}
        title="Perfil acadêmico"
        subtitle="Dados institucionais e privacidade (LGPD)"
      >
        <div className="rounded-[18px] bg-[#F8F9FA] dark:bg-[#282E40] p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[16px] font-bold text-[#102536] dark:text-white">
              {userName}
            </span>
            <StatusBadge variant="green" className="px-3 py-[5px] rounded-[8px]">
              {isAuthenticated ? 'Verificado .edu.br' : 'Visitante'}
            </StatusBadge>
          </div>
          <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7]">
            {userEmail || 'Não autenticado'}
          </p>
          <p className="text-[12.5px] font-medium text-[#102536] dark:text-[#CBD5E1]">
            {userProfile?.courseInfo || 'Curso não informado'}
          </p>
        </div>

        {isAuthenticated && (
          <div className="mb-4">
            <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1.5">
              Campus em Salvador
            </label>
            <select
              value={currentCampus.id}
              onChange={(e) => {
                void updateUserPreferences({ campusId: e.target.value });
              }}
              className="w-full h-[44px] px-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13px] font-semibold text-[#102536] dark:text-white focus:outline-none"
            >
              {SALVADOR_CAMPUSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2.5 mb-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                setShowAdminView(true);
              }}
              className="w-full h-[46px] rounded-[14px] bg-[#E1F7FC] dark:bg-[#133342] text-[#102536] dark:text-[#7AE4FF] font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Área Administrativa de Moderação
            </button>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                setExportedJson(null);
                setConfirmDelete(false);
                setActiveModal('lgpd');
              }}
              className="w-full h-[46px] rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] text-[#102536] dark:text-white font-bold text-[14px] cursor-pointer"
            >
              Meus dados e Privacidade (LGPD)
            </button>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                void logoutAcademic();
              }}
              className="w-full h-[46px] rounded-[14px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          ) : (
            <PrimaryButton
              onClick={() => {
                setActiveModal(null);
                navigateTo('login');
              }}
            >
              Entrar com conta acadêmica
            </PrimaryButton>
          )}
        </div>
      </ModalSheet>

      {/* LGPD Data Export & Deletion Modal */}
      <ModalSheet
        open={activeModal === 'lgpd'}
        onClose={() => setActiveModal(null)}
        title="Privacidade e LGPD"
        subtitle="Transparência, portabilidade e exclusão de dados"
      >
        <p className="text-[13px] leading-[1.5] text-[#596579] dark:text-[#A8B3C7] mb-3">
          Seus dados acadêmicos privados ficam isolados em subcoleção protegida. Comprovantes Pix são removidos após 7 dias (RNF01) e sua localização em tempo real cessa ao concluir a corrida (RF04).
        </p>

        <button
          type="button"
          onClick={() => setExportedJson(exportMyLgpdData())}
          className="w-full h-[44px] rounded-[12px] bg-[#E1F7FC] dark:bg-[#133342] text-[#102536] dark:text-[#7AE4FF] font-bold text-[13.5px] flex items-center justify-center gap-2 mb-3 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Exportar meus dados (JSON)
        </button>

        {exportedJson && (
          <pre className="rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] p-3 text-[11px] max-h-[140px] overflow-auto mb-3 text-[#102536] dark:text-[#E2E8F0]">
            {exportedJson}
          </pre>
        )}

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full h-[44px] rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] font-bold text-[13.5px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Excluir minha conta e dados
          </button>
        ) : (
          <div className="rounded-[14px] bg-[#FDEAF1] dark:bg-[#3B2034] p-3.5 space-y-2.5">
            <p className="text-[12.5px] font-semibold text-[#C51557] dark:text-[#FF6A9B]">
              Confirmar exclusão permanente dos seus dados pessoais e acesso?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-[40px] rounded-[10px] bg-white dark:bg-[#1E2230] text-[13px] font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setActiveModal(null);
                  await deleteMyAccountData();
                }}
                className="flex-1 h-[40px] rounded-[10px] bg-[#C51557] text-white text-[13px] font-bold cursor-pointer"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Moderation Contestation Modal (RF13) */}
      <ModalSheet
        open={activeModal === 'contest'}
        onClose={() => setActiveModal(null)}
        title="Contestação de moderação"
        subtitle="Direito de defesa e revisão administrativa (RF13)"
      >
        {latestModerationReport ? (
          <div className="space-y-3">
            <div className="rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] p-3.5 space-y-1">
              <p className="text-[12px] font-bold text-[#102536] dark:text-white">
                Status: {latestModerationReport.status} · Ação:{' '}
                {latestModerationReport.resolutionAction || 'em análise'}
              </p>
              {userProfile?.moderationReason && (
                <p className="text-[12.5px] text-[#596579] dark:text-[#A8B3C7]">
                  Justificativa: {userProfile.moderationReason}
                </p>
              )}
            </div>

            {contestSent || latestModerationReport.contestNote ? (
              <div className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] p-3 text-[12.5px] font-semibold">
                Contestação registrada: {latestModerationReport.contestNote || contestText}
              </div>
            ) : (
              <>
                <textarea
                  value={contestText}
                  onChange={(e) => setContestText(e.target.value)}
                  rows={3}
                  placeholder="Explique seu lado dos fatos para reavaliação da moderação..."
                  className="w-full p-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13.5px] text-[#102536] dark:text-white focus:outline-none"
                />
                <PrimaryButton
                  onClick={async () => {
                    if (contestText.trim().length < 5) return;
                    await contestModerationReport(
                      latestModerationReport.id,
                      contestText
                    );
                    setContestSent(true);
                  }}
                >
                  Enviar contestação
                </PrimaryButton>
              </>
            )}
          </div>
        ) : (
          <p className="text-[13.5px] text-[#596579] dark:text-[#A8B3C7]">
            Nenhuma ocorrência de moderação pendente.
          </p>
        )}
      </ModalSheet>
    </div>
  );
};
