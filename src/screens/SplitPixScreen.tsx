import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FileUp,
  Play,
  ShieldAlert,
  UserMinus,
} from 'lucide-react';
import { FlowHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { PixLogoIcon, PrimaryButton, StatusBadge } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { buildPixCopiaECola, formatCurrencyBRL } from '../utils/pix';

export const SplitPixScreen: React.FC = () => {
  const {
    selectedGroup,
    activeRideGroup,
    firebaseUser,
    goBack,
    navigateTo,
    submitReceiptUpload,
    confirmMemberPaymentVisual,
    startGroupRide,
    removeAbsentMemberWithRecalc,
    acceptRecalculation,
  } = useBoraJunto();

  const group = selectedGroup || activeRideGroup;

  const [copied, setCopied] = useState(false);
  const [activeModal, setActiveModal] = useState<
    null | 'receipt' | 'leader' | 'recalc'
  >(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [leaderMsg, setLeaderMsg] = useState<string | null>(null);
  const [leaderErr, setLeaderErr] = useState<string | null>(null);

  if (!group) {
    return (
      <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
        <div className="flex-1 flex flex-col">
          <StatusBar time="22:15" />
          <FlowHeader title="Cada um com sua parte" onBack={goBack} />
          <div className="px-6 py-10 text-center space-y-4">
            <p className="text-[14.5px] text-[#596579] dark:text-[#A8B3C7]">
              Nenhum grupo com divisão selecionado no momento.
            </p>
            <PrimaryButton onClick={() => navigateTo('groups')}>
              Encontrar grupo
            </PrimaryButton>
          </div>
        </div>
        <HomeIndicator />
      </div>
    );
  }

  const uid = firebaseUser?.uid || '';
  const isLeader = group.leaderId === uid;
  const myPayment = group.paymentsByUid[uid];
  const myMember = group.members.find((m) => m.uid === uid);
  const needsRecalcAccept = Boolean(
    myMember && myMember.acceptedRecalcVersion < group.recalcVersion
  );

  const shareAmount = myPayment?.amountDue || group.pricePerPerson;
  const pixCopiaECola =
    myPayment?.pixPayload ||
    Object.values(group.paymentsByUid)[0]?.pixPayload ||
    buildPixCopiaECola({
      pixKey: 'borajunto@ucsal.edu.br',
      merchantName: group.leaderName || 'BORAJUNTO',
      merchantCity: 'SALVADOR',
      amount: Math.max(0.01, shareAmount),
      txId: `BJ${group.id.slice(0, 10)}`,
    });

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pixCopiaECola);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = pixCopiaECola;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // Ignore clipboard restrictions
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadStatus(null);
    setUploading(true);
    const res = await submitReceiptUpload(group.id, file);
    setUploading(false);
    if (!res.ok) {
      setUploadError(res.error || 'Falha ao enviar comprovante.');
      return;
    }
    setUploadStatus(
      'Comprovante registrado com sucesso! Será removido automaticamente após 7 dias (RNF01).'
    );
  };

  const handleStartRide = async () => {
    setLeaderErr(null);
    setLeaderMsg(null);
    const res = await startGroupRide(group.id);
    if (!res.ok) {
      setLeaderErr(res.error || 'Não foi possível iniciar a corrida.');
      return;
    }
    setActiveModal(null);
    navigateTo('ride-active');
  };

  const handleRemoveMember = async (targetUid: string) => {
    setLeaderErr(null);
    setLeaderMsg(null);
    const res = await removeAbsentMemberWithRecalc(group.id, targetUid);
    if (!res.ok) {
      setLeaderErr(res.error || 'Não foi possível remover o integrante.');
      return;
    }
    setLeaderMsg(
      'Integrante removido e cota recalculada automaticamente para os demais (RF09/RF10).'
    );
  };

  const divisor =
    group.recalcVersion > 1 ? Math.max(1, group.memberIds.length) : group.totalSpots;
  const countText = `${group.memberIds.length}/${group.totalSpots}`;
  const isFull = group.memberIds.length >= group.totalSpots;

  const allPaymentsConfirmed = group.requiresPayment
    ? group.memberIds.every((id) => group.paymentsByUid[id]?.paymentConfirmed)
    : true;
  const allRecalcAccepted = group.members.every(
    (m) => m.acceptedRecalcVersion >= group.recalcVersion
  );
  const canStart = allPaymentsConfirmed && allRecalcAccepted;

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:15" />
        <FlowHeader title="Cada um com sua parte" onBack={goBack} />

        <div className="px-6 pb-3 flex-1 flex flex-col">
          {/* Status Pill */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <StatusBadge variant="green" className="px-4 py-[7px] rounded-[9px]">
              {isFull ? `Grupo completo · ${countText}` : `Grupo ativo · ${countText}`}
            </StatusBadge>

            {myPayment?.paymentConfirmed && (
              <StatusBadge variant="cyan" className="px-3 py-[7px] rounded-[9px]">
                Pago ✓
              </StatusBadge>
            )}
          </div>

          {needsRecalcAccept && (
            <button
              type="button"
              onClick={() => setActiveModal('recalc')}
              className="mb-4 rounded-[16px] bg-[#FDEAF1] dark:bg-[#3B2034] px-4 py-3 text-left flex items-center gap-2.5 cursor-pointer"
            >
              <AlertTriangle className="w-5 h-5 text-[#C51557] dark:text-[#FF6A9B] shrink-0" />
              <div>
                <p className="text-[12.5px] font-bold text-[#C51557] dark:text-[#FF6A9B]">
                  Rateio recalculado ({formatCurrencyBRL(shareAmount)})
                </p>
                <p className="text-[11.5px] text-[#596579] dark:text-[#CBD5E1]">
                  Toque para aceitar o novo valor e prosseguir (RF10)
                </p>
              </div>
            </button>
          )}

          {/* Highlighted Share Card */}
          <div className="rounded-[24px] bg-[#E3F5FC] dark:bg-[#12313F] px-6 py-6 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold tracking-[0.05em] uppercase text-[#596579] dark:text-[#A8B3C7]">
                SUA PARTE
              </span>
              <PixLogoIcon className="w-[26px] h-[26px] text-[#102536] dark:text-white" />
            </div>

            <p className="text-[42px] leading-none font-extrabold tracking-[-0.03em] text-[#102536] dark:text-white mt-4 tabular-nums">
              {formatCurrencyBRL(shareAmount)}
            </p>

            <p className="text-[16.5px] font-bold text-[#102536] dark:text-white mt-3 tabular-nums">
              {formatCurrencyBRL(group.totalCost)} ÷ {divisor} pessoas
            </p>

            <p className="text-[13px] text-[#596579] dark:text-[#B4C0D3] mt-4">
              Valor informado pelo líder da corrida.
            </p>
          </div>

          {/* Pix Section */}
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#102536] dark:text-white">
            Pix direto ao líder
          </h2>
          <p className="text-[13.5px] text-[#596579] dark:text-[#A8B3C7] mt-1 mb-4">
            O BoraJunto não recebe nem guarda seu dinheiro.
          </p>

          {/* Leader PIX Copia e Cola Card (WITHOUT exposing leader's raw Pix key) */}
          <div className="rounded-[22px] bg-white dark:bg-[#1E2230] p-5 figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] mb-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[16.5px] font-bold text-[#102536] dark:text-white">
                {group.leaderName}
              </span>
              <StatusBadge variant="cyan" className="px-4 py-[6px] rounded-[8px]">
                Líder
              </StatusBadge>
            </div>

            <p className="text-[12.5px] text-[#596579] dark:text-[#A8B3C7] mt-4">
              PIX Copia e Cola (valor já preenchido)
            </p>

            <div className="flex items-center justify-between gap-3 mt-1">
              <span className="text-[14.5px] font-bold tracking-[0.01em] text-[#102536] dark:text-white truncate font-mono">
                {pixCopiaECola.slice(0, 26)}...
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar código PIX Copia e Cola"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#596579] dark:text-[#CBD5E1] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                {copied ? (
                  <Check className="w-[18px] h-[18px] text-[#137A59] dark:text-[#4ADE80]" />
                ) : (
                  <Copy className="w-[18px] h-[18px]" strokeWidth={1.9} />
                )}
              </button>
            </div>
          </div>

          <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7] mb-3">
            Cole o código no app do seu banco e confira o destinatário antes de pagar.
          </p>

          {copied && (
            <div
              role="status"
              className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] px-3.5 py-2.5 text-[12.5px] font-semibold flex items-center gap-2 mb-3"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>PIX Copia e Cola copiado! Realize a transferência no app do seu banco.</span>
            </div>
          )}

          <div className="mt-auto space-y-2.5">
            <PrimaryButton onClick={handleCopy}>
              {copied ? 'PIX Copia e Cola copiado ✓' : 'Copiar PIX Copia e Cola'}
            </PrimaryButton>

            {!isLeader ? (
              <button
                type="button"
                onClick={() => {
                  setUploadError(null);
                  setUploadStatus(null);
                  setActiveModal('receipt');
                }}
                className="w-full h-[46px] rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] text-[#102536] dark:text-white font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileUp className="w-4 h-4" />
                {myPayment?.paymentConfirmed
                  ? 'Comprovante confirmado ✓'
                  : 'Enviar comprovante (RF07)'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLeaderErr(null);
                  setLeaderMsg(null);
                  setActiveModal('leader');
                }}
                className="w-full h-[46px] rounded-[14px] bg-[#102536] dark:bg-white text-white dark:text-[#102536] font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Confirmar pagamentos e iniciar (RF08)
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo('ride-active')}
              className="w-full text-center text-[15px] font-bold text-[#102536] dark:text-white mt-2 py-1 hover:opacity-80 cursor-pointer"
            >
              Voltar para minha volta
            </button>
          </div>
        </div>
      </div>

      <HomeIndicator />

      {/* Receipt Upload Modal (RF07 / RNF01) */}
      <ModalSheet
        open={activeModal === 'receipt'}
        onClose={() => setActiveModal(null)}
        title="Comprovar pagamento"
        subtitle="Envie o comprovante Pix ou peça confirmação visual ao líder (RF07)"
      >
        <div className="space-y-3.5">
          <div className="rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] p-3.5 text-[12.5px] text-[#596579] dark:text-[#A8B3C7]">
            Por privacidade (LGPD / RNF01), a imagem do comprovante é excluída automaticamente em <strong>7 dias</strong>, mantendo apenas o status de pagamento confirmado.
          </div>

          <label className="block w-full rounded-[14px] border-2 border-dashed border-[#00D2FF] bg-[#E1F7FC]/60 dark:bg-[#133342]/60 p-4 text-center cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
            />
            <FileUp className="w-6 h-6 mx-auto mb-1.5 text-[#102536] dark:text-[#7AE4FF]" />
            <span className="text-[13.5px] font-bold text-[#102536] dark:text-white block">
              {uploading ? 'Processando imagem...' : 'Selecionar imagem do comprovante'}
            </span>
          </label>

          {myPayment?.receiptPreviewDataUrl && (
            <img
              src={myPayment.receiptPreviewDataUrl}
              alt="Prévia do comprovante"
              className="w-full max-h-[160px] object-contain rounded-[12px] border border-[#DCE3EB] dark:border-[#32394D]"
            />
          )}

          {uploadError && (
            <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] p-3 text-[12.5px] font-semibold">
              {uploadError}
            </div>
          )}

          {uploadStatus && (
            <div className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] p-3 text-[12.5px] font-semibold">
              {uploadStatus}
            </div>
          )}

          <PrimaryButton onClick={() => setActiveModal(null)}>Concluir</PrimaryButton>
        </div>
      </ModalSheet>

      {/* Leader Payment Confirmation, 10-Min Removal & Start Lock Modal (RF07/RF08/RF09/RF10) */}
      <ModalSheet
        open={activeModal === 'leader'}
        onClose={() => setActiveModal(null)}
        title="Painel do líder"
        subtitle="Confirme pagamentos e controle a tolerância de 10 min"
      >
        <div className="space-y-3">
          {group.members.map((m) => {
            const p = group.paymentsByUid[m.uid];
            const isPaid = Boolean(p?.paymentConfirmed);
            const isSelf = m.uid === uid;
            return (
              <div
                key={m.uid}
                className="rounded-[16px] bg-[#EEF2F6] dark:bg-[#282E40] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-bold text-[#102536] dark:text-white">
                      {m.name} {isSelf ? '(Você)' : ''}
                    </p>
                    <p className="text-[11.5px] text-[#596579] dark:text-[#A8B3C7]">
                      {isPaid
                        ? p?.confirmationMethod === 'receipt_upload'
                          ? 'Comprovante enviado'
                          : 'Confirmado pelo líder'
                        : 'Pagamento pendente'}
                    </p>
                  </div>
                  <StatusBadge
                    variant={isPaid ? 'green' : 'pink'}
                    className="px-2.5 py-1 rounded-[8px]"
                  >
                    {isPaid ? 'Confirmado' : 'Pendente'}
                  </StatusBadge>
                </div>

                {p?.receiptPreviewDataUrl && (
                  <img
                    src={p.receiptPreviewDataUrl}
                    alt={`Comprovante de ${m.name}`}
                    className="w-full max-h-[110px] object-contain rounded-[10px] bg-white dark:bg-[#191D29]"
                  />
                )}

                {!isSelf && (
                  <div className="flex gap-2 pt-1">
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => void confirmMemberPaymentVisual(group.id, m.uid)}
                        className="flex-1 h-[36px] rounded-[10px] bg-[#E5F6EF] text-[#137A59] dark:bg-[#18392F] dark:text-[#66DBB1] text-[12px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmar visual (RF07)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(m.uid)}
                      className="flex-1 h-[36px] rounded-[10px] bg-[#FDEAF1] text-[#C51557] dark:bg-[#3B2034] dark:text-[#FF6A9B] text-[12px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Remover (+10 min)
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {leaderErr && (
            <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] p-3 text-[12.5px] font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{leaderErr}</span>
            </div>
          )}

          {leaderMsg && (
            <div className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] p-3 text-[12.5px] font-semibold">
              {leaderMsg}
            </div>
          )}

          <PrimaryButton
            onClick={handleStartRide}
            className={!canStart ? 'opacity-55' : ''}
          >
            {canStart
              ? 'Iniciar Corrida agora (RF08)'
              : 'Aguardando confirmações (RF08)'}
          </PrimaryButton>
        </div>
      </ModalSheet>

      {/* Recalculation Acceptance Modal (RF10) */}
      <ModalSheet
        open={activeModal === 'recalc'}
        onClose={() => setActiveModal(null)}
        title="Novo valor recalculado"
        subtitle="Um integrante ausente foi removido após 10 min (RF09/RF10)"
      >
        <div className="rounded-[16px] bg-[#E3F5FC] dark:bg-[#12313F] p-4 mb-4 space-y-1">
          <p className="text-[12px] font-bold uppercase text-[#596579] dark:text-[#A8B3C7]">
            Cota atualizada
          </p>
          <p className="text-[28px] font-extrabold text-[#102536] dark:text-white tabular-nums">
            {formatCurrencyBRL(shareAmount)}
          </p>
          <p className="text-[12.5px] text-[#596579] dark:text-[#B4C0D3]">
            Divisão atualizada para {group.memberIds.length} integrantes ativos.
          </p>
        </div>

        <PrimaryButton
          onClick={async () => {
            await acceptRecalculation(group.id);
            setActiveModal(null);
          }}
        >
          Aceitar novo valor e continuar
        </PrimaryButton>
      </ModalSheet>
    </div>
  );
};
