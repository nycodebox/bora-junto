import React, { useState } from 'react';
import { SlidersHorizontal, Users } from 'lucide-react';
import { FlowHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { CarFrontIcon, PrimaryButton, StatusBadge, WalkingIcon } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { ORIGIN_SHORT } from '../data/mockData';
import { GroupFilter, TransportMode } from '../types';

export const GroupsListScreen: React.FC = () => {
  const {
    goBack,
    navigateTo,
    destinationShort,
    classEndTime,
    selectedMode,
    activeFilter,
    setActiveFilter,
    filteredGroups,
    selectGroup,
  } = useBoraJunto();

  const [activeModal, setActiveModal] = useState<null | 'filters' | 'create'>(null);
  const [createSent, setCreateSent] = useState(false);

  const filters: GroupFilter[] = ['Todas', 'A pé', 'App', 'Carona'];

  const renderModeIcon = (mode: TransportMode) => {
    if (mode === 'bando') return <WalkingIcon className="w-[21px] h-[21px]" />;
    if (mode === 'racha') return <CarFrontIcon className="w-[21px] h-[21px]" />;
    return <Users className="w-[20px] h-[20px]" strokeWidth={1.85} />;
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:15" />
        <FlowHeader title="Quem vai com você?" onBack={goBack} />

        <div className="px-6 pb-4 flex-1 flex flex-col">
          {/* Route Context */}
          <div className="mb-4">
            <p className="text-[17.5px] font-bold text-[#102536] dark:text-white">
              {ORIGIN_SHORT} → {destinationShort}
            </p>
            <p className="text-[13.5px] text-[#596579] dark:text-[#A8B3C7] mt-0.5">
              Hoje · aula às {classEndTime} · destinos até 2 km
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-1.5 min-w-0">
              {filters.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`h-[34px] px-[13px] rounded-[11px] text-[12.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#102536] text-white dark:bg-white dark:text-[#102536]'
                        : 'bg-white dark:bg-[#222736] text-[#102536] dark:text-[#E2E8F0] border border-[#EDF1F6] dark:border-[#2C3245]'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setActiveModal('filters')}
              aria-label="Filtros de compatibilidade"
              className="w-[42px] h-[34px] rounded-[11px] bg-white dark:bg-[#222736] border border-[#EDF1F6] dark:border-[#2C3245] flex items-center justify-center text-[#102536] dark:text-white cursor-pointer hover:opacity-80 shrink-0"
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={1.9} />
            </button>
          </div>

          {/* Section Count */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[14.5px] font-medium text-[#102536] dark:text-white">
              {filteredGroups.length}{' '}
              {filteredGroups.length === 1 ? 'grupo compatível' : 'grupos compatíveis'}
            </span>
            <span className="text-[13.5px] font-bold text-[#C51557] dark:text-[#FF558C]">
              Melhor encaixe
            </span>
          </div>

          {/* Group Cards */}
          <div className="flex flex-col gap-3.5">
            {filteredGroups.map((group) => {
              const taken = group.members.length;
              const remaining = Math.max(0, group.totalSpots - taken);
              const vacancyText =
                remaining === 1 ? '1 vaga' : `${remaining} vagas`;
              const isHighlighted = group.mode === selectedMode;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    selectGroup(group.id);
                    navigateTo('group-detail');
                  }}
                  className={`w-full text-left rounded-[22px] p-[18px] transition-transform active:scale-[0.99] cursor-pointer ${
                    isHighlighted
                      ? 'bg-[#E1F7FC] dark:bg-[#133342] border-[1.75px] border-[#00D2FF]'
                      : 'bg-white dark:bg-[#1E2230] border border-[#EDF1F6] dark:border-[#272D3F] figma-card-shadow'
                  }`}
                >
                  {/* Top row: Icon + Title + Time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#102536] dark:text-white">
                        {renderModeIcon(group.mode)}
                      </span>
                      <span className="text-[17px] font-bold text-[#102536] dark:text-white">
                        {group.title}
                      </span>
                    </div>
                    <span className="text-[15.5px] font-bold text-[#102536] dark:text-white tabular-nums">
                      {group.departureTime}
                    </span>
                  </div>

                  {/* Middle + Right Price */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[13.5px] text-[#596579] dark:text-[#B4C0D3]">
                        {destinationShort} · {group.distanceLabel}
                      </p>
                      <div className="flex items-center gap-1.5 text-[13.5px] text-[#102536] dark:text-[#E2E8F0] mt-2">
                        <Users
                          className="w-[15px] h-[15px] text-[#596579] dark:text-[#94A3B8]"
                          strokeWidth={1.85}
                        />
                        <span>
                          {taken} de {group.totalSpots} pessoas · {vacancyText}
                        </span>
                      </div>
                      <div className="mt-3">
                        <StatusBadge
                          variant="neutral"
                          className={`px-3.5 py-[6px] rounded-[9px] ${
                            isHighlighted
                              ? '!bg-white dark:!bg-[#12151E]'
                              : ''
                          }`}
                        >
                          {group.badgeTag}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="text-right pb-0.5 shrink-0">
                      <p className="text-[22px] leading-none font-extrabold text-[#102536] dark:text-white tabular-nums">
                        {group.priceDisplay}
                      </p>
                      <p className="text-[12px] text-[#596579] dark:text-[#A8B3C7] mt-1.5">
                        {group.priceSub}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[12px] text-[#596579] dark:text-[#94A3B8] mt-4">
            *Estimativa de R$ 34,00 dividida por 4 pessoas.
          </p>

          <p className="text-center text-[14.5px] text-[#102536] dark:text-white mt-5 pb-1">
            <span className="font-medium">Não encontrou?</span>{' '}
            <button
              type="button"
              onClick={() => {
                setCreateSent(false);
                setActiveModal('create');
              }}
              className="font-bold hover:underline cursor-pointer"
            >
              Criar meu grupo
            </button>
          </p>
        </div>
      </div>

      <HomeIndicator />

      {/* Filter Info Modal */}
      <ModalSheet
        open={activeModal === 'filters'}
        onClose={() => setActiveModal(null)}
        title="Critérios de compatibilidade"
        subtitle="Parâmetros ativos no protótipo"
      >
        <div className="space-y-3 mb-5">
          <div className="rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] px-4 py-3 flex items-center justify-between">
            <span className="text-[13.5px] text-[#596579] dark:text-[#A8B3C7]">
              Raio máximo entre destinos
            </span>
            <span className="text-[14px] font-bold text-[#102536] dark:text-white">
              Até 2 km
            </span>
          </div>
          <div className="rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] px-4 py-3 flex items-center justify-between">
            <span className="text-[13.5px] text-[#596579] dark:text-[#A8B3C7]">
              Diferença de término de aula
            </span>
            <span className="text-[14px] font-bold text-[#102536] dark:text-white">
              Até 15 min
            </span>
          </div>
        </div>
        <PrimaryButton onClick={() => setActiveModal(null)}>Aplicar</PrimaryButton>
      </ModalSheet>

      {/* Provisional Create Group Modal */}
      <ModalSheet
        open={activeModal === 'create'}
        onClose={() => setActiveModal(null)}
        title="Criar meu grupo"
        subtitle="Interação provisória (sem tela dedicada no protótipo)"
      >
        <div className="rounded-[16px] bg-[#EEF2F6] dark:bg-[#282E40] p-4 mb-4 space-y-1.5">
          <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7]">
            Trajeto previsto
          </p>
          <p className="text-[15px] font-bold text-[#102536] dark:text-white">
            {ORIGIN_SHORT} → {destinationShort} · {classEndTime}
          </p>
        </div>
        {createSent ? (
          <div className="rounded-[14px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] px-4 py-3 text-[13.5px] font-semibold mb-3">
            Solicitação provisória registrada. Selecione um dos grupos disponíveis para continuar o fluxo.
          </div>
        ) : (
          <PrimaryButton onClick={() => setCreateSent(true)} className="mb-3">
            Simular abertura de grupo
          </PrimaryButton>
        )}
        <button
          type="button"
          onClick={() => setActiveModal(null)}
          className="w-full py-2 text-[14px] font-bold text-[#596579] dark:text-[#A8B3C7] cursor-pointer"
        >
          Voltar para a lista
        </button>
      </ModalSheet>
    </div>
  );
};
