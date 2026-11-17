import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Flag,
  MessageSquare,
  PhoneCall,
  Play,
  Send,
  Share2,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { FlowHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { RealMap } from '../components/RealMap';
import { PrimaryButton, StatusBadge } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { ReportCategory } from '../types';

export const RideActiveScreen: React.FC = () => {
  const {
    activeRideGroup,
    currentCampus,
    destinationShort,
    destinationCoords,
    firebaseUser,
    userName,
    goBack,
    navigateTo,
    chatMessages,
    unreadMessagesCount,
    markChatRead,
    sendChatMessage,
    gpsStatus,
    startGroupRide,
    completeGroupRide,
    submitPostTripRating,
    submitReport,
  } = useBoraJunto();

  const [chatOpen, setChatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [shareFeedback, setShareFeedback] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [liveRouteStats, setLiveRouteStats] = useState<{
    etaMinutes: number;
  } | null>(null);
  const [rideActionError, setRideActionError] = useState<string | null>(null);
  const [sosCopied, setSosCopied] = useState(false);

  // Rating state (RF12)
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingSafetyOk, setRatingSafetyOk] = useState(true);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaved, setRatingSaved] = useState(false);

  // Report state (RF11)
  const [reportTargetUid, setReportTargetUid] = useState('');
  const [reportCategory, setReportCategory] = useState<ReportCategory>('inappropriate_behavior');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const uid = firebaseUser?.uid || '';

  const participantsText = useMemo(() => {
    if (!activeRideGroup) return userName;
    const names = activeRideGroup.members.map((m) => m.name.split(' ')[0]);
    if (names.length === 0) return userName;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} e ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
  }, [activeRideGroup, userName]);

  if (!activeRideGroup) {
    return (
      <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
        <div className="flex-1 flex flex-col">
          <StatusBar time="22:43" />
          <FlowHeader title="Sua volta, em companhia" onBack={goBack} />
          <div className="px-6 py-10 text-center space-y-4">
            <p className="text-[15px] text-[#596579] dark:text-[#A8B3C7]">
              Você ainda não ingressou em nenhum grupo ativo.
            </p>
            <PrimaryButton onClick={() => navigateTo('groups')}>
              Encontrar grupo agora
            </PrimaryButton>
          </div>
        </div>
        <HomeIndicator />
      </div>
    );
  }

  const isLeader = activeRideGroup.leaderId === uid;
  const totalMembersCount = activeRideGroup.memberIds.length;
  const displayEtaMin = liveRouteStats?.etaMinutes ?? activeRideGroup.etaMinutes;

  const statusBadgeText =
    activeRideGroup.status === 'in_progress'
      ? 'Em andamento'
      : activeRideGroup.status === 'completed'
      ? 'Concluída'
      : 'Aguardando saída';

  const handleOpenChat = () => {
    markChatRead();
    setChatOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    const text = messageInput;
    setMessageInput('');
    await sendChatMessage(text);
  };

  const handleShareRide = async () => {
    const shareText = `Estou voltando pelo BoraJunto (${activeRideGroup.title}) de ${currentCampus.shortName} para ${activeRideGroup.destinationLabel} com ${participantsText}. Previsão de chegada: ${activeRideGroup.estimatedArrival}.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Minha volta no BoraJunto',
          text: shareText,
        });
        setShareFeedback('Trajeto compartilhado com sucesso via dispositivo.');
        setShareOpen(true);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      }
    } catch {
      // Ignore clipboard failure in restricted iframes
    }
    setShareFeedback(
      'Resumo do seu trajeto copiado para enviar ao seu contato de confiança.'
    );
    setShareOpen(true);
  };

  const handleCopySosSummary = async () => {
    const myLoc = activeRideGroup.liveLocations.find((l) => l.uid === uid);
    const coordsText = myLoc
      ? `https://www.openstreetmap.org/?mlat=${myLoc.lat.toFixed(5)}&mlon=${myLoc.lng.toFixed(5)}`
      : `${currentCampus.name} → ${activeRideGroup.destinationLabel}`;
    const sosMsg = `ALERTA SOS BORAJUNTO · ${userName} precisa de ajuda no trajeto ${activeRideGroup.title}. Localização: ${coordsText}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sosMsg);
      }
    } catch {
      // Ignore
    }
    setSosCopied(true);
    setTimeout(() => setSosCopied(false), 2500);
  };

  const otherMembers = activeRideGroup.members.filter((m) => m.uid !== uid);

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:43" />
        <FlowHeader title="Sua volta, em companhia" onBack={goBack} />

        <div className="px-6 pb-3 flex-1 flex flex-col">
          {/* Status Row */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <StatusBadge variant="green" className="px-3.5 py-[7px] rounded-[9px]">
                {statusBadgeText}
              </StatusBadge>
              <span className="text-[13px] font-medium text-[#596579] dark:text-[#A8B3C7] truncate">
                {activeRideGroup.title} · {totalMembersCount} pessoas
              </span>
            </div>

            {gpsStatus === 'sharing' && (
              <StatusBadge variant="cyan" className="px-2.5 py-[6px] rounded-[8px]">
                GPS ativo
              </StatusBadge>
            )}
          </div>

          {/* Real OpenStreetMap + OpenRouteService Active Map */}
          <RealMap
            mode="active"
            origin={{
              lat: activeRideGroup.meetingLat || currentCampus.centerLat,
              lng: activeRideGroup.meetingLng || currentCampus.centerLng,
            }}
            destination={{
              lat: activeRideGroup.destinationLat || destinationCoords.lat,
              lng: activeRideGroup.destinationLng || destinationCoords.lng,
            }}
            campusLabel={currentCampus.shortName}
            destinationLabel={
              activeRideGroup.destinationLabel.split(',')[0] || destinationShort
            }
            transportMode={activeRideGroup.mode}
            liveLocations={activeRideGroup.liveLocations}
            currentUserId={uid}
            onRouteComputed={(info) => {
              setLiveRouteStats({
                etaMinutes: Math.max(4, Math.round(info.durationSeconds / 60)),
              });
            }}
          />

          {/* ETA Card */}
          <div className="rounded-[22px] bg-white dark:bg-[#1E2230] px-5 py-4 figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] flex items-center justify-between mt-4 mb-5">
            <div>
              <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7]">
                Chegada prevista
              </p>
              <p className="text-[26px] leading-tight font-extrabold text-[#102536] dark:text-white tabular-nums mt-0.5">
                {activeRideGroup.estimatedArrival}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[24px] leading-tight font-extrabold text-[#102536] dark:text-white tabular-nums">
                {displayEtaMin} min
              </p>
              <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7] mt-0.5">
                até seu destino
              </p>
            </div>
          </div>

          {/* Group Names */}
          <div className="mb-4">
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#102536] dark:text-white">
              Todo mundo no mesmo caminho
            </h2>
            <p className="text-[14.5px] text-[#596579] dark:text-[#A8B3C7] mt-1">
              {participantsText}
            </p>
          </div>

          {/* Group Chat Card */}
          <button
            type="button"
            onClick={handleOpenChat}
            className="w-full rounded-[20px] bg-white dark:bg-[#1E2230] px-5 py-[16px] figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] flex items-center justify-between mb-4 cursor-pointer hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-3.5">
              <MessageSquare
                className="w-[20px] h-[20px] text-[#102536] dark:text-white"
                strokeWidth={2}
              />
              <span className="text-[15.5px] font-bold text-[#102536] dark:text-white">
                Conversar com o grupo
              </span>
            </div>
            {unreadMessagesCount > 0 ? (
              <StatusBadge
                variant="pink"
                className="w-[28px] h-[24px] rounded-[8px] font-bold"
              >
                {unreadMessagesCount}
              </StatusBadge>
            ) : (
              <span className="text-[12px] font-semibold text-[#596579] dark:text-[#94A3B8]">
                Abrir
              </span>
            )}
          </button>

          {rideActionError && (
            <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] px-3.5 py-2.5 text-[12.5px] font-semibold mb-3">
              {rideActionError}
            </div>
          )}

          {/* Bottom Safety, SOS, Leader Controls & Share CTA */}
          <div className="mt-auto">
            <div className="flex items-center justify-between gap-2 mb-3.5 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck
                  className="w-[19px] h-[19px] text-[#137A59] dark:text-[#4ADE80] shrink-0"
                  strokeWidth={2}
                />
                <span className="text-[12.5px] text-[#596579] dark:text-[#A8B3C7] truncate">
                  Segurança ativa no trajeto.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSosOpen(true)}
                  className="px-2.5 py-1 rounded-[8px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] text-[11.5px] font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  SOS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportSent(false);
                    setReportTargetUid(otherMembers[0]?.uid || '');
                    setReportOpen(true);
                  }}
                  aria-label="Denunciar incidente"
                  className="px-2.5 py-1 rounded-[8px] bg-[#EEF2F6] dark:bg-[#282E40] text-[#596579] dark:text-[#CBD5E1] text-[11.5px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Reportar
                </button>
              </div>
            </div>

            {isLeader && activeRideGroup.status !== 'completed' && (
              <button
                type="button"
                onClick={async () => {
                  setRideActionError(null);
                  if (activeRideGroup.status === 'in_progress') {
                    await completeGroupRide(activeRideGroup.id);
                    setRatingSaved(false);
                    setRateOpen(true);
                  } else {
                    const res = await startGroupRide(activeRideGroup.id);
                    if (!res.ok) {
                      setRideActionError(
                        res.error || 'Aguarde confirmação dos pagamentos.'
                      );
                    }
                  }
                }}
                className="w-full h-[46px] rounded-[14px] bg-[#102536] dark:bg-white text-white dark:text-[#102536] font-bold text-[14px] flex items-center justify-center gap-2 mb-2.5 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {activeRideGroup.status === 'in_progress'
                  ? 'Cheguei · Encerrar corrida'
                  : 'Iniciar Corrida (RF08)'}
              </button>
            )}

            {activeRideGroup.status === 'completed' ? (
              <PrimaryButton
                onClick={() => {
                  setRatingSaved(false);
                  setRateOpen(true);
                }}
              >
                Avaliar minha volta (RF12)
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={handleShareRide}>
                Compartilhar minha volta
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>

      <HomeIndicator />

      {/* Real Firestore Group Chat Modal */}
      <ModalSheet
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Conversar com o grupo"
        subtitle={`${activeRideGroup.title} · Mensagens em tempo real`}
      >
        <div className="space-y-2.5 max-h-[250px] overflow-y-auto mb-4 pr-1">
          {chatMessages.length === 0 ? (
            <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7] text-center py-6">
              Nenhuma mensagem ainda. Combine os últimos detalhes da saída!
            </p>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-[14px] px-3.5 py-2.5 ${
                  msg.isMe
                    ? 'bg-[#E1F7FC] dark:bg-[#133342] ml-6'
                    : 'bg-[#EEF2F6] dark:bg-[#282E40] mr-6'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[12px] font-bold text-[#102536] dark:text-white">
                    {msg.sender}
                  </span>
                  <span className="text-[11px] text-[#596579] dark:text-[#94A3B8] tabular-nums">
                    {msg.time}
                  </span>
                </div>
                <p className="text-[13.5px] text-[#102536] dark:text-[#E2E8F0]">
                  {msg.text}
                </p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Escreva uma mensagem..."
            className="flex-1 h-[46px] px-4 rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] text-[#102536] dark:text-white placeholder:text-[#596579] dark:placeholder:text-[#94A3B8] focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Enviar mensagem"
            className="w-[46px] h-[46px] rounded-[14px] bg-[#00D2FF] text-[#102536] flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#00C4EF]"
          >
            <Send className="w-[18px] h-[18px]" strokeWidth={2.1} />
          </button>
        </form>
      </ModalSheet>

      {/* Share Feedback Modal */}
      <ModalSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Compartilhar minha volta"
        subtitle="Resumo seguro para contato de confiança"
      >
        <div className="rounded-[16px] bg-[#EEF2F6] dark:bg-[#282E40] p-4 mb-4 space-y-1.5">
          <div className="flex items-center gap-2 text-[#137A59] dark:text-[#66DBB1] text-[13px] font-bold">
            <Share2 className="w-4 h-4" />
            <span>
              {activeRideGroup.title} · {statusBadgeText}
            </span>
          </div>
          <p className="text-[13.5px] font-semibold text-[#102536] dark:text-white">
            {currentCampus.shortName} → {activeRideGroup.destinationLabel}
          </p>
          <p className="text-[12.5px] text-[#596579] dark:text-[#A8B3C7]">
            Participantes: {participantsText} · Chegada prevista:{' '}
            {activeRideGroup.estimatedArrival}
          </p>
        </div>

        <div className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] px-3.5 py-2.5 text-[12.5px] font-semibold flex items-center gap-2 mb-4">
          <Check className="w-4 h-4 shrink-0" />
          <span>{shareFeedback}</span>
        </div>

        <PrimaryButton onClick={() => setShareOpen(false)}>Fechar</PrimaryButton>
      </ModalSheet>

      {/* SOS Emergency Modal (RF05) */}
      <ModalSheet
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        title="Botão de Emergência (SOS)"
        subtitle="Acionamento rápido para situações de risco (RF05)"
      >
        <div className="space-y-3">
          <a
            href="tel:190"
            className="w-full h-[50px] rounded-[14px] bg-[#C51557] text-white font-bold text-[15px] flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            Ligar Polícia Militar (190)
          </a>
          <a
            href="tel:192"
            className="w-full h-[50px] rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] text-[#102536] dark:text-white font-bold text-[15px] flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            Ligar SAMU (192)
          </a>
          <button
            type="button"
            onClick={handleCopySosSummary}
            className="w-full h-[46px] rounded-[14px] bg-[#E1F7FC] dark:bg-[#133342] text-[#102536] dark:text-[#7AE4FF] font-bold text-[13.5px] cursor-pointer"
          >
            {sosCopied
              ? 'Coordenadas e trajeto copiados ✓'
              : 'Copiar coordenadas e dados do grupo'}
          </button>
        </div>
      </ModalSheet>

      {/* Post-Trip Rating Modal (RF12) */}
      <ModalSheet
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        title="Como foi sua volta?"
        subtitle="Avaliação pós-viagem para segurança da comunidade (RF12)"
      >
        {ratingSaved ? (
          <div className="space-y-4">
            <div className="rounded-[14px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] p-4 text-[13.5px] font-semibold">
              Avaliação registrada! Obrigado por contribuir com a segurança universitária.
            </div>
            <PrimaryButton onClick={() => setRateOpen(false)}>Concluir</PrimaryButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingScore(star)}
                  className="p-1.5 cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= ratingScore
                        ? 'fill-[#00D2FF] text-[#00D2FF]'
                        : 'text-[#CBD5E1] dark:text-[#475569]'
                    }`}
                  />
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2.5 text-[13.5px] font-semibold text-[#102536] dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={ratingSafetyOk}
                onChange={(e) => setRatingSafetyOk(e.target.checked)}
                className="accent-[#00D2FF]"
              />
              <span>Me senti seguro(a) durante todo o trajeto</span>
            </label>

            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              rows={2}
              placeholder="Comentário opcional..."
              className="w-full p-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13.5px] text-[#102536] dark:text-white focus:outline-none"
            />

            <PrimaryButton
              onClick={async () => {
                await submitPostTripRating(
                  activeRideGroup.id,
                  ratingScore,
                  ratingSafetyOk,
                  ratingComment
                );
                setRatingSaved(true);
              }}
            >
              Enviar avaliação
            </PrimaryButton>
          </div>
        )}
      </ModalSheet>

      {/* Report Incident Modal (RF11) */}
      <ModalSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Registrar denúncia"
        subtitle="Encaminhada à moderação com prazo de até 24h úteis (RF11)"
      >
        {reportSent ? (
          <div className="space-y-4">
            <div className="rounded-[14px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] p-4 text-[13.5px] font-semibold">
              Denúncia registrada com protocolo de moderação. Casos de risco imediato recebem prioridade máxima.
            </div>
            <PrimaryButton onClick={() => setReportOpen(false)}>Fechar</PrimaryButton>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
                Integrante envolvido
              </label>
              <select
                value={reportTargetUid}
                onChange={(e) => setReportTargetUid(e.target.value)}
                className="w-full h-[44px] px-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13.5px] font-semibold text-[#102536] dark:text-white focus:outline-none"
              >
                {otherMembers.length === 0 ? (
                  <option value={activeRideGroup.leaderId}>
                    {activeRideGroup.leaderName}
                  </option>
                ) : (
                  otherMembers.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
                Categoria
              </label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
                className="w-full h-[44px] px-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13.5px] font-semibold text-[#102536] dark:text-white focus:outline-none"
              >
                <option value="immediate_risk">Risco imediato (Prioridade máxima)</option>
                <option value="inappropriate_behavior">Conduta inadequada</option>
                <option value="fraud">Problema com pagamento / Pix</option>
                <option value="rule_violation">Descumprimento de regras do campus</option>
              </select>
            </div>

            <textarea
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              rows={3}
              placeholder="Descreva o ocorrido com detalhes (mínimo 5 caracteres)..."
              className="w-full p-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13.5px] text-[#102536] dark:text-white focus:outline-none"
            />

            <PrimaryButton
              onClick={async () => {
                if (reportDesc.trim().length < 5) return;
                const targetMember =
                  otherMembers.find((m) => m.uid === reportTargetUid) ||
                  activeRideGroup.members[0];
                await submitReport({
                  groupId: activeRideGroup.id,
                  reportedUid: targetMember?.uid || activeRideGroup.leaderId,
                  reportedName: targetMember?.name || activeRideGroup.leaderName,
                  category: reportCategory,
                  description: reportDesc,
                });
                setReportSent(true);
              }}
            >
              Enviar à moderação
            </PrimaryButton>
          </div>
        )}
      </ModalSheet>
    </div>
  );
};
