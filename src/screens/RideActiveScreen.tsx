import React, { useMemo, useState } from 'react';
import { Check, MessageSquare, Send, Share2, ShieldCheck } from 'lucide-react';
import { FlowHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { IllustrativeMap, PrimaryButton, StatusBadge } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { ORIGIN_SHORT } from '../data/mockData';

export const RideActiveScreen: React.FC = () => {
  const {
    activeRideGroup,
    destinationShort,
    rideStatus,
    userName,
    goBack,
    chatMessages,
    unreadMessagesCount,
    markChatRead,
    sendChatMessage,
  } = useBoraJunto();

  const [chatOpen, setChatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');

  const participantsText = useMemo(() => {
    const names = activeRideGroup.members.map((m) => m.name.split(' ')[0]);
    const hasUser = activeRideGroup.members.some((m) => m.id === 'current-user');
    const allNames = hasUser ? names : [userName, ...names];
    if (allNames.length <= 1) return allNames[0] || userName;
    if (allNames.length === 2) return `${allNames[0]} e ${allNames[1]}`;
    return `${allNames.slice(0, -1).join(', ')} e ${allNames[allNames.length - 1]}`;
  }, [activeRideGroup.members, userName]);

  const totalMembersCount = activeRideGroup.members.some(
    (m) => m.id === 'current-user'
  )
    ? activeRideGroup.members.length
    : activeRideGroup.members.length + 1;

  const handleOpenChat = () => {
    markChatRead();
    setChatOpen(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendChatMessage(messageInput);
    setMessageInput('');
  };

  const handleShareRide = async () => {
    const shareText = `Estou voltando pelo BoraJunto (${activeRideGroup.title}) de ${ORIGIN_SHORT} para ${destinationShort} com ${participantsText}. Previsão de chegada: ${activeRideGroup.estimatedArrival}.`;

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
      'Compartilhamento nativo indisponível neste navegador. O resumo da sua volta foi copiado.'
    );
    setShareOpen(true);
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:43" />
        <FlowHeader title="Sua volta, em companhia" onBack={goBack} />

        <div className="px-6 pb-3 flex-1 flex flex-col">
          {/* Status Row */}
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge variant="green" className="px-4 py-[7px] rounded-[9px]">
              {rideStatus}
            </StatusBadge>
            <span className="text-[13.5px] font-medium text-[#596579] dark:text-[#A8B3C7]">
              {activeRideGroup.title} · {totalMembersCount} pessoas
            </span>
          </div>

          {/* Active Route Map */}
          <IllustrativeMap
            mode="active"
            destinationLabel={destinationShort}
            transportMode={activeRideGroup.mode}
          />

          {/* ETA Card */}
          <div className="rounded-[22px] bg-white dark:bg-[#1E2230] px-5 py-4 figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] flex items-center justify-between mt-4 mb-6">
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
                {activeRideGroup.etaMinutes} min
              </p>
              <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7] mt-0.5">
                até seu destino
              </p>
            </div>
          </div>

          {/* Group Names */}
          <div className="mb-5">
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
            className="w-full rounded-[20px] bg-white dark:bg-[#1E2230] px-5 py-[16px] figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] flex items-center justify-between mb-6 cursor-pointer hover:opacity-95 transition-opacity"
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

          {/* Bottom Safety & Share CTA */}
          <div className="mt-auto">
            <div className="flex items-center gap-2.5 mb-4 px-1">
              <ShieldCheck
                className="w-[20px] h-[20px] text-[#137A59] dark:text-[#4ADE80] shrink-0"
                strokeWidth={2}
              />
              <span className="text-[13px] text-[#596579] dark:text-[#A8B3C7]">
                Compartilhe o trajeto com alguém de confiança.
              </span>
            </div>

            <PrimaryButton onClick={handleShareRide}>
              Compartilhar minha volta
            </PrimaryButton>
          </div>
        </div>
      </div>

      <HomeIndicator />

      {/* Provisional Group Chat Modal */}
      <ModalSheet
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Conversar com o grupo"
        subtitle={`${activeRideGroup.title} · Chat provisório (simulado)`}
      >
        <div className="space-y-2.5 max-h-[250px] overflow-y-auto mb-4 pr-1">
          {chatMessages.map((msg) => (
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
          ))}
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
            <span>{activeRideGroup.title} · {rideStatus}</span>
          </div>
          <p className="text-[13.5px] font-semibold text-[#102536] dark:text-white">
            {ORIGIN_SHORT} → {destinationShort}
          </p>
          <p className="text-[12.5px] text-[#596579] dark:text-[#A8B3C7]">
            Participantes: {participantsText} · Chegada prevista: {activeRideGroup.estimatedArrival}
          </p>
        </div>

        <div className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] px-3.5 py-2.5 text-[12.5px] font-semibold flex items-center gap-2 mb-4">
          <Check className="w-4 h-4 shrink-0" />
          <span>{shareFeedback}</span>
        </div>

        <PrimaryButton onClick={() => setShareOpen(false)}>Fechar</PrimaryButton>
      </ModalSheet>
    </div>
  );
};
