import React, { useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { FlowHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { RealMap } from '../components/RealMap';
import { PrimaryButton, StatusBadge } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { formatCurrencyBRL } from '../utils/pix';

export const GroupDetailScreen: React.FC = () => {
  const {
    selectedGroup,
    currentCampus,
    firebaseUser,
    goBack,
    navigateTo,
    selectGroup,
    joinSelectedGroup,
    leaveGroup,
    authError,
  } = useBoraJunto();

  const [joining, setJoining] = useState(false);

  if (!selectedGroup) {
    return (
      <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
        <div className="flex-1 flex flex-col">
          <StatusBar time="22:15" />
          <FlowHeader title="Seu próximo grupo" onBack={goBack} />
          <div className="px-6 py-10 text-center space-y-4">
            <p className="text-[15px] font-semibold text-[#596579] dark:text-[#A8B3C7]">
              Selecione ou crie um grupo na lista para visualizar os detalhes da rota.
            </p>
            <PrimaryButton onClick={() => navigateTo('groups')}>
              Ver grupos disponíveis
            </PrimaryButton>
          </div>
        </div>
        <HomeIndicator />
      </div>
    );
  }

  const remainingSpots = Math.max(
    0,
    selectedGroup.totalSpots - selectedGroup.memberIds.length
  );
  const spotsLabel =
    remainingSpots === 0
      ? 'Grupo completo'
      : remainingSpots === 1
      ? '1 vaga disponível'
      : `${remainingSpots} vagas disponíveis`;

  const alreadyJoined = Boolean(
    firebaseUser && selectedGroup.memberIds.includes(firebaseUser.uid)
  );
  const isLeader = Boolean(
    firebaseUser && selectedGroup.leaderId === firebaseUser.uid
  );

  const ctaLabel = isLeader
    ? 'Gerenciar grupo'
    : selectedGroup.requiresPayment
    ? alreadyJoined
      ? `Ver Pix · ${formatCurrencyBRL(selectedGroup.pricePerPerson)}*`
      : `Entrar no grupo · ${formatCurrencyBRL(selectedGroup.pricePerPerson)}*`
    : alreadyJoined
    ? 'Ver minha volta · Gratuito'
    : 'Entrar no grupo · Gratuito';

  const handlePrimaryAction = async () => {
    if (isLeader) {
      selectGroup(selectedGroup.id);
      if (
        selectedGroup.requiresPayment &&
        selectedGroup.status !== 'in_progress' &&
        selectedGroup.status !== 'completed'
      ) {
        navigateTo('split-pix');
        return;
      }
      navigateTo('ride-active');
      return;
    }

    setJoining(true);
    await joinSelectedGroup();
    setJoining(false);
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:15" />
        <FlowHeader title="Seu próximo grupo" onBack={goBack} />

        <div className="px-6 pb-3 flex-1 flex flex-col">
          {/* Top Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <StatusBadge variant="cyan" className="px-4 py-[7px] rounded-[9px]">
              {selectedGroup.title}
            </StatusBadge>
            <StatusBadge
              variant={remainingSpots === 0 ? 'green' : 'pink'}
              className="px-4 py-[7px] rounded-[9px]"
            >
              {spotsLabel}
            </StatusBadge>
            {isLeader && (
              <StatusBadge
                variant="neutral"
                className="px-3.5 py-[7px] rounded-[9px]"
              >
                Meu grupo · Organizador
              </StatusBadge>
            )}
          </div>

          {/* Real OpenStreetMap + OpenRouteService Preview Map */}
          <RealMap
            mode="preview"
            origin={{
              lat: selectedGroup.meetingLat || currentCampus.centerLat,
              lng: selectedGroup.meetingLng || currentCampus.centerLng,
            }}
            destination={{
              lat: selectedGroup.destinationLat,
              lng: selectedGroup.destinationLng,
            }}
            campusLabel={currentCampus.shortName}
            destinationLabel={selectedGroup.destinationLabel.split(',')[0]}
            transportMode={selectedGroup.mode}
          />

          {/* Route Summary */}
          <div className="mt-5 mb-4">
            <h2 className="text-[21px] font-bold tracking-[-0.02em] text-[#102536] dark:text-white">
              {currentCampus.shortName} →{' '}
              {selectedGroup.destinationLabel.split(',')[0]}
            </h2>
            <div className="flex items-center gap-2 text-[14px] text-[#596579] dark:text-[#A8B3C7] mt-1.5">
              <Clock className="w-[16px] h-[16px] shrink-0" strokeWidth={1.9} />
              <span className="tabular-nums">
                Saída {selectedGroup.departureTime} · chegada prevista{' '}
                {selectedGroup.estimatedArrival}
              </span>
            </div>
          </div>

          {/* Meeting Point Card */}
          <div className="rounded-[20px] bg-white dark:bg-[#1E2230] px-4 py-4 figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] flex items-center gap-3.5 mb-6">
            <MapPin
              className="w-[22px] h-[22px] text-[#E11D60] dark:text-[#F43F7A] shrink-0"
              strokeWidth={2}
            />
            <div>
              <p className="text-[16px] font-bold text-[#102536] dark:text-white">
                {selectedGroup.meetingPoint}
              </p>
              <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7] mt-0.5">
                {selectedGroup.meetingHint}
              </p>
            </div>
          </div>

          {/* Members List */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[18px] font-bold text-[#102536] dark:text-white">
              Quem já está no grupo
            </h3>
            <span className="text-[14px] font-semibold text-[#596579] dark:text-[#A8B3C7] tabular-nums">
              {selectedGroup.memberIds.length}/{selectedGroup.totalSpots}
            </span>
          </div>

          <div className="flex flex-col gap-3.5 mb-5">
            {selectedGroup.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[15.5px] font-bold text-[#102536] dark:text-white truncate">
                    {member.name}
                  </p>
                  <p className="text-[12.5px] text-[#596579] dark:text-[#A8B3C7] mt-0.5 truncate">
                    {member.courseInfo}
                  </p>
                </div>
                <StatusBadge
                  variant={member.badgeVariant}
                  className="w-[92px] h-[28px] rounded-[9px] shrink-0"
                >
                  {member.roleBadge}
                </StatusBadge>
              </div>
            ))}
          </div>

          {authError && (
            <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] px-3.5 py-2.5 text-[12.5px] font-semibold mb-3">
              {authError}
            </div>
          )}

          <div className="mt-auto">
            <p className="text-center text-[12px] text-[#596579] dark:text-[#94A3B8] mb-3">
              Até 2 km entre destinos · 15 min entre aulas
            </p>
            <PrimaryButton
              onClick={handlePrimaryAction}
              disabled={joining || (!isLeader && !alreadyJoined && remainingSpots === 0)}
            >
              {joining
                ? 'Confirmando vaga...'
                : !isLeader && !alreadyJoined && remainingSpots === 0
                ? 'Grupo completo'
                : ctaLabel}
            </PrimaryButton>

            {alreadyJoined && !isLeader && selectedGroup.status !== 'in_progress' && (
              <button
                type="button"
                onClick={() => void leaveGroup(selectedGroup.id)}
                className="w-full text-center text-[13px] font-bold text-[#C51557] dark:text-[#FF6A9B] mt-3 py-1 cursor-pointer"
              >
                Sair do grupo
              </button>
            )}
          </div>
        </div>
      </div>

      <HomeIndicator />
    </div>
  );
};
