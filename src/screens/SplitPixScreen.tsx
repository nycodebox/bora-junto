import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { FlowHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { PixLogoIcon, PrimaryButton, StatusBadge } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { formatCurrencyBRL } from '../data/mockData';

export const SplitPixScreen: React.FC = () => {
  const { selectedGroup, goBack, navigateTo } = useBoraJunto();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const keyToCopy = selectedGroup.leaderPixKey || '12348256719';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(keyToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = keyToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // Fallback visual confirmation even if clipboard permission is blocked in iframe
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const countText = `${selectedGroup.members.length}/${selectedGroup.totalSpots}`;
  const isFull = selectedGroup.members.length >= selectedGroup.totalSpots;

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:15" />
        <FlowHeader title="Cada um com sua parte" onBack={goBack} />

        <div className="px-6 pb-3 flex-1 flex flex-col">
          {/* Status Pill */}
          <div className="mb-4">
            <StatusBadge variant="green" className="px-4 py-[7px] rounded-[9px]">
              {isFull ? `Grupo completo · ${countText}` : `Grupo ativo · ${countText}`}
            </StatusBadge>
          </div>

          {/* Highlighted Share Card */}
          <div className="rounded-[24px] bg-[#E3F5FC] dark:bg-[#12313F] px-6 py-6 mb-7">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold tracking-[0.05em] uppercase text-[#596579] dark:text-[#A8B3C7]">
                SUA PARTE
              </span>
              <PixLogoIcon className="w-[26px] h-[26px] text-[#102536] dark:text-white" />
            </div>

            <p className="text-[42px] leading-none font-extrabold tracking-[-0.03em] text-[#102536] dark:text-white mt-4 tabular-nums">
              {formatCurrencyBRL(selectedGroup.pricePerPerson)}
            </p>

            <p className="text-[16.5px] font-bold text-[#102536] dark:text-white mt-3 tabular-nums">
              {formatCurrencyBRL(selectedGroup.totalCost)} ÷ {selectedGroup.totalSpots}{' '}
              pessoas
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

          {/* Leader Pix Card */}
          <div className="rounded-[22px] bg-white dark:bg-[#1E2230] p-5 figma-card-shadow border border-[#EDF1F6] dark:border-[#272D3F] mb-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[16.5px] font-bold text-[#102536] dark:text-white">
                {selectedGroup.leaderName}
              </span>
              <StatusBadge variant="cyan" className="px-4 py-[6px] rounded-[8px]">
                Líder
              </StatusBadge>
            </div>

            <p className="text-[12.5px] text-[#596579] dark:text-[#A8B3C7] mt-4">
              Chave CPF
            </p>

            <div className="flex items-center justify-between gap-3 mt-1">
              <span className="text-[19px] font-bold tracking-[0.02em] text-[#102536] dark:text-white tabular-nums">
                {selectedGroup.leaderPixMasked || '•••.482.•••-19'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar chave CPF"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#596579] dark:text-[#CBD5E1] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-[18px] h-[18px] text-[#137A59] dark:text-[#4ADE80]" />
                ) : (
                  <Copy className="w-[18px] h-[18px]" strokeWidth={1.9} />
                )}
              </button>
            </div>
          </div>

          <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7] mb-4">
            Confira o nome do destinatário no seu banco.
          </p>

          {copied && (
            <div
              role="status"
              className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] px-3.5 py-2.5 text-[12.5px] font-semibold flex items-center gap-2 mb-3"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Chave Pix copiada! Realize a transferência no app do seu banco.</span>
            </div>
          )}

          <div className="mt-auto">
            <PrimaryButton onClick={handleCopy}>
              {copied ? 'Chave Pix copiada ✓' : 'Copiar chave Pix'}
            </PrimaryButton>

            <p className="text-center text-[12px] text-[#596579] dark:text-[#94A3B8] mt-3.5">
              Pagamento externo · confirme com o líder após pagar.
            </p>

            <button
              type="button"
              onClick={() => navigateTo('ride-active')}
              className="w-full text-center text-[15px] font-bold text-[#102536] dark:text-white mt-4 py-1 hover:opacity-80 cursor-pointer"
            >
              Voltar para minha volta
            </button>
          </div>
        </div>
      </div>

      <HomeIndicator />
    </div>
  );
};
