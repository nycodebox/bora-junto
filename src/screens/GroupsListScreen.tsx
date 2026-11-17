import React, { useState } from 'react';
import { ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { FlowHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { LocationSearchInput } from '../components/LocationSearchInput';
import {
  CarFrontIcon,
  PrimaryButton,
  StatusBadge,
  WalkingIcon,
} from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { GeoLocation, GroupFilter, TransportMode } from '../types';

export const GroupsListScreen: React.FC = () => {
  const {
    goBack,
    navigateTo,
    currentCampus,
    destination,
    destinationShort,
    destinationCoords,
    destinationLocation,
    classEndTime,
    selectedMode,
    activeFilter,
    setActiveFilter,
    myCreatedGroups,
    filteredGroups,
    selectGroup,
    createGroup,
    isAuthenticated,
  } = useBoraJunto();

  const [activeModal, setActiveModal] = useState<null | 'filters' | 'create'>(null);

  // Create group form state
  const [newMode, setNewMode] = useState<TransportMode>(selectedMode);
  const [newDeparture, setNewDeparture] = useState(classEndTime);
  const [newMeetingIdx, setNewMeetingIdx] = useState(0);
  const [newDestLabel, setNewDestLabel] = useState(destination);
  const [newDestLocation, setNewDestLocation] = useState<GeoLocation | null>(null);
  const [newSpots, setNewSpots] = useState(4);
  const [caronaIsPaid, setCaronaIsPaid] = useState(false);
  const [newTotalCost, setNewTotalCost] = useState('34.00');
  const [newPixKey, setNewPixKey] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filters: GroupFilter[] = ['Todas', 'A pé', 'App', 'Carona'];

  const renderModeIcon = (mode: TransportMode) => {
    if (mode === 'bando') return <WalkingIcon className="w-[21px] h-[21px]" />;
    if (mode === 'racha') return <CarFrontIcon className="w-[21px] h-[21px]" />;
    return <Users className="w-[20px] h-[20px]" strokeWidth={1.85} />;
  };

  const openCreateModal = () => {
    setNewMode(selectedMode);
    setNewDeparture(classEndTime);
    setNewMeetingIdx(0);
    setNewDestLabel(destination);
    setNewDestLocation(
      destinationLocation || {
        name: destinationShort,
        label: destination,
        formattedAddress: destination,
        city: 'Salvador',
        lat: destinationCoords.lat,
        lng: destinationCoords.lng,
      }
    );
    setNewSpots(selectedMode === 'bando' ? 6 : 4);
    setCaronaIsPaid(false);
    setNewTotalCost('34.00');
    setNewPixKey('');
    setCreateError(null);
    setActiveModal('create');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newDestLocation || !newDestLabel.trim()) {
      setCreateError(
        'Pesquise e selecione explicitamente o destino do grupo na lista de sugestões.'
      );
      return;
    }

    const mp =
      currentCampus.meetingPoints[newMeetingIdx] ||
      currentCampus.meetingPoints[0];

    const parsedCost = Number(newTotalCost.replace(',', '.'));
    const requiresPayment =
      newMode === 'racha' || (newMode === 'carona' && caronaIsPaid);

    setCreating(true);
    const res = await createGroup({
      mode: newMode,
      departureTime: newDeparture,
      meetingPoint: mp.label,
      meetingHint: mp.hint,
      meetingLat: mp.lat,
      meetingLng: mp.lng,
      destinationLabel: newDestLocation.name || newDestLocation.label,
      destinationLat: newDestLocation.lat,
      destinationLng: newDestLocation.lng,
      destinationLocation: newDestLocation,
      maxSpots: newSpots,
      caronaIsPaid,
      totalCost: requiresPayment && !Number.isNaN(parsedCost) ? parsedCost : 0,
      leaderPixKey: newPixKey,
    });
    setCreating(false);

    if (!res.ok) {
      setCreateError(res.error || 'Erro ao criar o grupo.');
      return;
    }

    setActiveModal(null);
    navigateTo('group-detail');
  };

  const paidPreviewGroup =
    filteredGroups.find((g) => g.requiresPayment && g.totalCost > 0) ||
    myCreatedGroups.find((g) => g.requiresPayment && g.totalCost > 0);

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:15" />
        <FlowHeader title="Quem vai com você?" onBack={goBack} />

        <div className="px-6 pb-4 flex-1 flex flex-col">
          {/* Route Context */}
          <div className="mb-4">
            <p className="text-[17.5px] font-bold text-[#102536] dark:text-white">
              {currentCampus.shortName} → {destinationShort}
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

          {/* My Created Groups Section (always visible to the creator regardless of compatibility/modality filters) */}
          {isAuthenticated && myCreatedGroups.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14.5px] font-bold text-[#102536] dark:text-white">
                  Meus grupos ({myCreatedGroups.length})
                </span>
                <span className="text-[12.5px] font-semibold text-[#104A63] dark:text-[#7AE4FF]">
                  Organizador
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {myCreatedGroups.map((group) => {
                  const taken = group.memberIds.length;
                  const remaining = Math.max(0, group.totalSpots - taken);
                  const vacancyText =
                    remaining === 0
                      ? 'Grupo completo'
                      : remaining === 1
                      ? '1 vaga'
                      : `${remaining} vagas`;

                  return (
                    <button
                      key={`my-${group.id}`}
                      type="button"
                      onClick={() => {
                        selectGroup(group.id);
                        navigateTo('group-detail');
                      }}
                      className="w-full text-left rounded-[22px] p-[18px] transition-transform active:scale-[0.99] cursor-pointer bg-[#E1F7FC] dark:bg-[#133342] border-[1.75px] border-[#00D2FF]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[#102536] dark:text-white shrink-0">
                            {renderModeIcon(group.mode)}
                          </span>
                          <span className="text-[17px] font-bold text-[#102536] dark:text-white truncate">
                            {group.title}
                          </span>
                        </div>
                        <span className="text-[15.5px] font-bold text-[#102536] dark:text-white tabular-nums shrink-0">
                          {group.departureTime}
                        </span>
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13.5px] text-[#596579] dark:text-[#B4C0D3] truncate">
                            {group.destinationLabel.split(',')[0]} · {group.distanceLabel}
                          </p>
                          <div className="flex items-center gap-1.5 text-[13.5px] text-[#102536] dark:text-[#E2E8F0] mt-2">
                            <Users
                              className="w-[15px] h-[15px] text-[#596579] dark:text-[#94A3B8] shrink-0"
                              strokeWidth={1.85}
                            />
                            <span>
                              {taken} de {group.totalSpots} pessoas · {vacancyText}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-3">
                            <StatusBadge
                              variant="cyan"
                              className="px-3 py-[6px] rounded-[9px] !bg-white dark:!bg-[#12151E]"
                            >
                              Meu grupo
                            </StatusBadge>
                            <StatusBadge
                              variant="neutral"
                              className="px-3 py-[6px] rounded-[9px] !bg-white/85 dark:!bg-[#1E2230]"
                            >
                              Organizador
                            </StatusBadge>
                          </div>
                        </div>

                        <div className="text-right pb-0.5 shrink-0 flex flex-col items-end">
                          <p className="text-[22px] leading-none font-extrabold text-[#102536] dark:text-white tabular-nums">
                            {group.priceDisplay}
                          </p>
                          <p className="text-[12px] text-[#596579] dark:text-[#A8B3C7] mt-1.5">
                            {group.priceSub}
                          </p>
                          <span className="mt-2 text-[12px] font-bold text-[#102536] dark:text-[#7AE4FF]">
                            Gerenciar grupo →
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Group Cards or Empty State */}
          {filteredGroups.length === 0 ? (
            <div className="rounded-[22px] bg-white dark:bg-[#1E2230] p-5 border border-[#EDF1F6] dark:border-[#272D3F] figma-card-shadow text-center space-y-3 my-2">
              <p className="text-[15.5px] font-bold text-[#102536] dark:text-white">
                {isAuthenticated
                  ? myCreatedGroups.length > 0
                    ? 'Nenhum outro grupo compatível aberto agora'
                    : 'Nenhum grupo compatível aberto agora'
                  : 'Entre com seu e-mail .edu.br'}
              </p>
              <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7]">
                {isAuthenticated
                  ? `Não encontramos grupos de outros estudantes a até 2 km de ${destinationShort} com saída em ±15 min de ${classEndTime}.`
                  : 'Os grupos reais da sua universidade em Salvador aparecem após o login institucional verificado.'}
              </p>
              <PrimaryButton
                onClick={
                  isAuthenticated
                    ? openCreateModal
                    : () => navigateTo('login')
                }
              >
                {isAuthenticated ? 'Criar meu grupo agora' : 'Ir para login .edu.br'}
              </PrimaryButton>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {filteredGroups.map((group) => {
                const taken = group.memberIds.length;
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
                          {group.destinationLabel.split(',')[0]} · {group.distanceLabel}
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
                              isHighlighted ? '!bg-white dark:!bg-[#12151E]' : ''
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
          )}

          {paidPreviewGroup && (
            <p className="text-[12px] text-[#596579] dark:text-[#94A3B8] mt-4">
              *Estimativa de R${' '}
              {paidPreviewGroup.totalCost.toFixed(2).replace('.', ',')} dividida
              por {paidPreviewGroup.totalSpots} pessoas.
            </p>
          )}

          {isAuthenticated && (
            <p className="text-center text-[14.5px] text-[#102536] dark:text-white mt-5 pb-1">
              <span className="font-medium">Não encontrou?</span>{' '}
              <button
                type="button"
                onClick={openCreateModal}
                className="font-bold hover:underline cursor-pointer"
              >
                Criar meu grupo
              </button>
            </p>
          )}
        </div>
      </div>

      <HomeIndicator />

      {/* Filter Info Modal */}
      <ModalSheet
        open={activeModal === 'filters'}
        onClose={() => setActiveModal(null)}
        title="Critérios de compatibilidade"
        subtitle="Regras geográficas e de horário ativas (RF02)"
      >
        <div className="space-y-3 mb-5">
          <div className="rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] px-4 py-3 flex items-center justify-between">
            <span className="text-[13.5px] text-[#596579] dark:text-[#A8B3C7]">
              Raio máximo entre destinos (Haversine)
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

      {/* Real Create Group Modal */}
      <ModalSheet
        open={activeModal === 'create'}
        onClose={() => setActiveModal(null)}
        title="Criar meu grupo"
        subtitle={`Origem validada no perímetro de ${currentCampus.shortName}`}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
              Modalidade
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['bando', 'racha', 'carona'] as TransportMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setNewMode(m);
                    if (m === 'bando') setCaronaIsPaid(false);
                  }}
                  className={`py-2.5 rounded-[12px] text-[12.5px] font-bold cursor-pointer ${
                    newMode === m
                      ? 'bg-[#E1F7FC] dark:bg-[#133342] border border-[#00D2FF] text-[#102536] dark:text-white'
                      : 'bg-[#EEF2F6] dark:bg-[#282E40] text-[#596579] dark:text-[#CBD5E1]'
                  }`}
                >
                  {m === 'bando' ? 'Em bando' : m === 'racha' ? 'Racha App' : 'Carona'}
                </button>
              ))}
            </div>
          </div>

          {newMode === 'carona' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCaronaIsPaid(false)}
                className={`flex-1 py-2 rounded-[10px] text-[12.5px] font-bold cursor-pointer ${
                  !caronaIsPaid
                    ? 'bg-[#E5F6EF] text-[#137A59] dark:bg-[#18392F] dark:text-[#66DBB1]'
                    : 'bg-[#EEF2F6] dark:bg-[#282E40] text-[#596579]'
                }`}
              >
                Carona Gratuita
              </button>
              <button
                type="button"
                onClick={() => setCaronaIsPaid(true)}
                className={`flex-1 py-2 rounded-[10px] text-[12.5px] font-bold cursor-pointer ${
                  caronaIsPaid
                    ? 'bg-[#E1F7FC] text-[#102536] dark:bg-[#133342] dark:text-[#7AE4FF]'
                    : 'bg-[#EEF2F6] dark:bg-[#282E40] text-[#596579]'
                }`}
              >
                Dividir custos
              </button>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
              Ponto de encontro dentro do campus (RF14)
            </label>
            <select
              value={newMeetingIdx}
              onChange={(e) => setNewMeetingIdx(Number(e.target.value))}
              className="w-full h-[44px] px-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13px] font-semibold text-[#102536] dark:text-white focus:outline-none"
            >
              {currentCampus.meetingPoints.map((mp, idx) => (
                <option key={mp.label} value={idx}>
                  {mp.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-[#137A59] dark:text-[#66DBB1]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dentro do perímetro seguro do campus</span>
            </div>
          </div>

          <div>
            <LocationSearchInput
              label="Destino do grupo"
              placeholder="Pesquise bairro, rua, ponto de referência..."
              value={newDestLabel}
              selectedLocation={newDestLocation}
              onTextChange={(val) => {
                setNewDestLabel(val);
                if (
                  newDestLocation &&
                  newDestLocation.name !== val &&
                  newDestLocation.label !== val
                ) {
                  setNewDestLocation(null);
                }
              }}
              onSelectLocation={(loc) => {
                setNewDestLocation(loc);
                setNewDestLabel(loc.name || loc.label);
              }}
              onClear={() => {
                setNewDestLabel('');
                setNewDestLocation(null);
              }}
              required
              helperText="Sugestões dinâmicas via OpenRouteService para Salvador e RMS."
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
                Horário de saída
              </label>
              <input
                type="time"
                value={newDeparture}
                onChange={(e) => setNewDeparture(e.target.value)}
                className="w-full h-[44px] px-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] font-bold tabular-nums text-[#102536] dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
                Total de vagas
              </label>
              <select
                value={newSpots}
                onChange={(e) => setNewSpots(Number(e.target.value))}
                className="w-full h-[44px] px-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] font-bold text-[#102536] dark:text-white focus:outline-none"
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} pessoas
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(newMode === 'racha' || (newMode === 'carona' && caronaIsPaid)) && (
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
                  Valor total a dividir (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newTotalCost}
                  onChange={(e) => setNewTotalCost(e.target.value)}
                  placeholder="34,00"
                  className="w-full h-[44px] px-3.5 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] font-bold tabular-nums text-[#102536] dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
                  Sua chave Pix (apenas para gerar o PIX Copia e Cola)
                </label>
                <input
                  type="text"
                  value={newPixKey}
                  onChange={(e) => setNewPixKey(e.target.value)}
                  placeholder="E-mail, celular ou chave aleatória"
                  className="w-full h-[44px] px-3.5 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13.5px] font-medium text-[#102536] dark:text-white focus:outline-none"
                />
                <p className="text-[11px] text-[#596579] dark:text-[#94A3B8] mt-1">
                  Sua chave não será exibida na tela dos passageiros — apenas o código PIX Copia e Cola.
                </p>
              </div>
            </div>
          )}

          {createError && (
            <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] px-3.5 py-2.5 text-[12.5px] font-semibold">
              {createError}
            </div>
          )}

          <PrimaryButton type="submit" disabled={creating}>
            {creating ? 'Publicando grupo...' : 'Publicar grupo'}
          </PrimaryButton>
        </form>
      </ModalSheet>
    </div>
  );
};
