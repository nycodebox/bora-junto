import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { BrandHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { PrimaryButton } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';

export const LoginScreen: React.FC = () => {
  const { loginSimulated } = useBoraJunto();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [activeModal, setActiveModal] = useState<
    null | 'forgot' | 'register' | 'shield'
  >(null);
  const [recoverySent, setRecoverySent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Informe seu e-mail acadêmico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Digite um endereço de e-mail válido.';
    } else if (!trimmedEmail.toLowerCase().endsWith('.edu.br')) {
      nextErrors.email = 'Use um e-mail institucional com domínio .edu.br.';
    }

    if (!password.trim()) {
      nextErrors.password = 'Informe sua senha.';
    } else if (password.trim().length < 4) {
      nextErrors.password = 'A senha deve ter pelo menos 4 caracteres.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    loginSimulated(trimmedEmail);
  };

  const handleDemoFill = () => {
    setEmail('ana.souza@universidade.edu.br');
    setPassword('12345678');
    setErrors({});
    setActiveModal(null);
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F9FA] dark:bg-[#12151E] text-[#102536] dark:text-white">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StatusBar time="22:15" />
        <BrandHeader
          rightIcon="shield"
          onRightClick={() => setActiveModal('shield')}
        />

        <form onSubmit={handleSubmit} noValidate className="px-6 pt-1 flex-1 flex flex-col">
          <h1 className="text-[31px] leading-[1.14] font-bold tracking-[-0.025em] text-[#102536] dark:text-white mb-3">
            Seu campus.
            <br />
            Sua comunidade.
          </h1>

          <p className="text-[15px] leading-[1.48] text-[#596579] dark:text-[#A8B3C7] mb-7">
            Entre com seu e-mail acadêmico para
            <br />
            encontrar quem vai na mesma direção.
          </p>

          {/* Email Field */}
          <div className="mb-4">
            <label
              htmlFor="academic-email"
              className="block text-[13.5px] font-bold text-[#102536] dark:text-white mb-2"
            >
              E-mail acadêmico
            </label>
            <div
              className={`h-[54px] px-4 rounded-[16px] bg-white dark:bg-[#232838] border flex items-center gap-3 transition-colors ${
                errors.email
                  ? 'border-[#E11D60] dark:border-[#FF558C]'
                  : 'border-[#DCE3EB] dark:border-[#32394D] focus-within:border-[#00D2FF]'
              }`}
            >
              <Mail
                className="w-[19px] h-[19px] text-[#596579] dark:text-[#94A3B8] shrink-0"
                strokeWidth={1.8}
              />
              <input
                id="academic-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="voce@universidade.edu.br"
                autoComplete="email"
                className="w-full bg-transparent text-[15px] font-medium text-[#102536] dark:text-white placeholder:text-[#596579] dark:placeholder:text-[#94A3B8] focus:outline-none"
              />
            </div>
            {errors.email && (
              <p className="text-[12px] font-medium text-[#C51557] dark:text-[#FF6A9B] mt-1.5">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="mb-3">
            <label
              htmlFor="academic-password"
              className="block text-[13.5px] font-bold text-[#102536] dark:text-white mb-2"
            >
              Senha
            </label>
            <div
              className={`h-[54px] px-4 rounded-[16px] bg-white dark:bg-[#232838] border flex items-center gap-3 transition-colors ${
                errors.password
                  ? 'border-[#E11D60] dark:border-[#FF558C]'
                  : 'border-[#DCE3EB] dark:border-[#32394D] focus-within:border-[#00D2FF]'
              }`}
            >
              <Lock
                className="w-[19px] h-[19px] text-[#596579] dark:text-[#94A3B8] shrink-0"
                strokeWidth={1.8}
              />
              <input
                id="academic-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-transparent text-[16px] tracking-[0.08em] text-[#102536] dark:text-white placeholder:text-[#596579] dark:placeholder:text-[#94A3B8] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Alternar visualização da senha"
                className="text-[#596579] dark:text-[#CBD5E1] hover:opacity-75 cursor-pointer shrink-0 p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-[20px] h-[20px]" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-[20px] h-[20px]" strokeWidth={1.8} />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[12px] font-medium text-[#C51557] dark:text-[#FF6A9B] mt-1.5">
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex justify-end mb-6">
            <button
              type="button"
              onClick={() => {
                setRecoverySent(false);
                setActiveModal('forgot');
              }}
              className="text-[13.5px] font-bold text-[#C51557] dark:text-[#FF558C] hover:opacity-80 cursor-pointer"
            >
              Esqueci minha senha
            </button>
          </div>

          <PrimaryButton type="submit">
            Entrar com minha conta
          </PrimaryButton>

          <p className="text-center text-[14.5px] text-[#102536] dark:text-[#E2E8F0] mt-5">
            <span className="font-medium">Primeira vez?</span>{' '}
            <button
              type="button"
              onClick={() => setActiveModal('register')}
              className="font-bold hover:underline cursor-pointer"
            >
              Criar conta acadêmica
            </button>
          </p>

          <div className="flex items-start gap-3 mt-7 pb-2 px-1">
            <ShieldCheck
              className="w-[20px] h-[20px] text-[#137A59] dark:text-[#4ADE80] shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <p className="text-[13.5px] leading-[1.45] text-[#596579] dark:text-[#94A3B8]">
              Verificação acadêmica para uma
              <br />
              comunidade de estudantes.
            </p>
          </div>
        </form>
      </div>

      <HomeIndicator />

      {/* Provisional Modals */}
      <ModalSheet
        open={activeModal === 'forgot'}
        onClose={() => setActiveModal(null)}
        title="Recuperar acesso"
        subtitle="Interação provisória de protótipo"
      >
        <p className="text-[14px] leading-[1.5] text-[#596579] dark:text-[#A8B3C7] mb-4">
          Nesta etapa do protótipo não há envio real de e-mails. Em produção, as instruções serão enviadas para o seu endereço institucional <span className="font-semibold text-[#102536] dark:text-white">.edu.br</span>.
        </p>
        {recoverySent ? (
          <div className="rounded-[14px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] px-4 py-3 text-[13.5px] font-semibold mb-4">
            Simulação concluída: instruções enviadas para {email.trim() || 'voce@universidade.edu.br'}.
          </div>
        ) : (
          <PrimaryButton onClick={() => setRecoverySent(true)} className="mb-3">
            Simular envio de recuperação
          </PrimaryButton>
        )}
        <button
          type="button"
          onClick={() => setActiveModal(null)}
          className="w-full py-2.5 text-[14px] font-bold text-[#596579] dark:text-[#A8B3C7] cursor-pointer"
        >
          Voltar ao login
        </button>
      </ModalSheet>

      <ModalSheet
        open={activeModal === 'register'}
        onClose={() => setActiveModal(null)}
        title="Criar conta acadêmica"
        subtitle="Cadastro ainda não habilitado nesta etapa"
      >
        <p className="text-[14px] leading-[1.5] text-[#596579] dark:text-[#A8B3C7] mb-4">
          O fluxo completo de cadastro com validação de vínculo acadêmico (.edu.br) será implementado na próxima etapa. Para testar a navegação agora, preencha um e-mail institucional ou utilize os dados de demonstração abaixo.
        </p>
        <PrimaryButton onClick={handleDemoFill} className="mb-3">
          Preencher conta de demonstração
        </PrimaryButton>
        <button
          type="button"
          onClick={() => setActiveModal(null)}
          className="w-full py-2.5 text-[14px] font-bold text-[#596579] dark:text-[#A8B3C7] cursor-pointer"
        >
          Fechar
        </button>
      </ModalSheet>

      <ModalSheet
        open={activeModal === 'shield'}
        onClose={() => setActiveModal(null)}
        title="Verificação acadêmica"
        subtitle="Comunidade exclusiva para estudantes"
      >
        <p className="text-[14px] leading-[1.5] text-[#596579] dark:text-[#A8B3C7] mb-4">
          O acesso ao BoraJunto exige vínculo institucional com e-mail <span className="font-semibold text-[#102536] dark:text-white">.edu.br</span> para garantir que todos os integrantes pertençam à comunidade universitária.
        </p>
        <PrimaryButton onClick={() => setActiveModal(null)}>
          Entendi
        </PrimaryButton>
      </ModalSheet>
    </div>
  );
};
