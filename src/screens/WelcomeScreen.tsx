import React from 'react';
import { HomeIndicator, StatusBar } from '../components/MobileShell';
import { PrimaryButton } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';

export const WelcomeScreen: React.FC = () => {
  const { navigateTo } = useBoraJunto();

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div>
        <StatusBar time="22:15" />
        <div className="px-6 pt-5">
          <p className="text-[11.5px] font-bold tracking-[0.06em] uppercase text-[#596579] dark:text-[#A8B3C7]">
            BOAS VINDAS À SUA NOVA VOLTA
          </p>
        </div>
      </div>

      {/* Central 3D Emblem */}
      <div className="flex-1 flex items-center justify-center px-6">
        <img
          src="/assets/brand/brand-emblem.png"
          alt="Emblema BoraJunto"
          className="w-[216px] h-auto object-contain select-none"
        />
      </div>

      {/* Bottom Brand & CTA Block */}
      <div className="px-6 pb-2">
        <img
          src="/assets/brand/borajunto-wordmark.png"
          alt="BoraJunto"
          className="h-[42px] w-auto object-contain mb-4 select-none"
        />

        <h1 className="text-[31px] leading-[1.14] font-bold tracking-[-0.025em] text-[#102536] dark:text-white mb-3">
          A volta é melhor
          <br />
          com companhia.
        </h1>

        <p className="text-[15.5px] leading-[1.48] text-[#596579] dark:text-[#A8B3C7] mb-7">
          Do campus para casa: divida o caminho,
          <br />a corrida e boas conversas.
        </p>

        <PrimaryButton onClick={() => navigateTo('login')}>
          Começar minha volta
        </PrimaryButton>

        <p className="text-center text-[13px] font-medium text-[#596579] dark:text-[#94A3B8] mt-4 mb-5">
          Sua comunidade. Seu caminho.
        </p>
      </div>

      <HomeIndicator />
    </div>
  );
};
