import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { FlowHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { IllustrativeMap, PrimaryButton, StatusBadge } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { ORIGIN_SHORT, formatCurrencyBRL } from '../data/mockData';

export const GroupDetailScreen: React.FC = () => {
  const {
    selectedGroup,
    destinationShort,
    goBack,
    joinSelectedGroup,
    joinedGroupId,
  } = useBoraJunto();

  const remainingSpots = Math.max(
    0,
    selectedGroup.totalSpots - selectedGroup.members.length
  );
  const spotsLabel =
    remainingSpots === 0
      ? 'Grupo completo'
      : remainingSpots === 1
      ? '1 vaga disponível'
      : `${remainingSpots} vagas disponíveis`;

  const alreadyJoined = joinedGroupId === selectedGroup.id;

  const ctaLabel =
    selectedGroup.mode === 'racha'
      ? alreadyJoined
        ? `Ver Pix · ${formatCurrencyBRL(selectedGroup.pricePerPerson)}*`
        : `Entrar no grupo · ${formatCurrencyBRL(selectedGroup.pricePerPerson)}*`
      : alreadyJoined
      ? 'Ver minha volta · Gratuito'
      : 'Entrar no grupo · Gratuito';

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:15" />
        <FlowHeader title="Seu próximo grupo" onBack={goBack} />

        <div className="px-6 pb-3 flex-1 flex flex-col">
          {/* Top Badges */}
          <div className="flex items-center gap-2.5 mb-4">
            <StatusBadge variant="cyan" className="px-4 py-[7px] rounded-[9px]">
              {selectedGroup.title}
            </StatusBadge>
            <StatusBadge
              variant={remainingSpots === 0 ? 'green' : 'pink'}
              className="px-4 py-[7px] rounded-[9px]"
            >
              {spotsLabel}
            </StatusBadge>
          </div>

          {/* Illustrative Map */}
          <IllustrativeMap
            mode="preview"
            destinationLabel={destinationShort}
            transportMode={selectedGroup.mode}
          />

          {/* Route Summary */}
          <div className="mt-5 mb-4">
            <h2 className="text-[21px] font-bold tracking-[-0.02em] text-[#102536] dark:text-white">
              {ORIGIN_SHORT} → {destinationShort}
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
              {selectedGroup.members.length}/{selectedGroup.totalSpots}
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

          <div className="mt-auto">
            <p className="text-center text-[12px] text-[#596579] dark:text-[#94A3B8] mb-3">
              Até 2 km entre destinos · 10 min entre aulas
            </p>
            <PrimaryButton onClick={joinSelectedGroup}>
              {ctaLabel}
            </PrimaryButton>
          </div>
        </div>
      </div>

      <HomeIndicator />
    </div>
  );
};
