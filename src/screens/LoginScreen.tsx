import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { BrandHeader, HomeIndicator, StatusBar } from '../components/MobileShell';
import { ModalSheet } from '../components/ModalSheet';
import { LocationSearchInput } from '../components/LocationSearchInput';
import { PrimaryButton } from '../components/ReusableUI';
import { useBoraJunto } from '../context/BoraJuntoContext';
import {
  CLASS_END_TIME_OPTIONS,
  SALVADOR_CAMPUSES,
} from '../utils/geo';
import { GeoLocation } from '../types';

export const LoginScreen: React.FC = () => {
  const {
    loginAcademic,
    signUpAcademic,
    resendVerificationEmail,
    checkEmailVerifiedNow,
    resetPasswordAcademic,
    pendingVerificationEmail,
    authError,
    clearAuthError,
  } = useBoraJunto();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [activeModal, setActiveModal] = useState<
    null | 'forgot' | 'register' | 'shield' | 'verify'
  >(null);

  // Password recovery state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [recoveryErr, setRecoveryErr] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCourse, setRegCourse] = useState('');
  const [regCampusId, setRegCampusId] = useState(SALVADOR_CAMPUSES[0].id);
  const [regDestLabel, setRegDestLabel] = useState('');
  const [regDestLocation, setRegDestLocation] = useState<GeoLocation | null>(null);
  const [regClassEnd, setRegClassEnd] = useState('22:30');
  const [regPhone, setRegPhone] = useState('');
  const [regLgpd, setRegLgpd] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Verification modal feedback
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [checkingVerify, setCheckingVerify] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
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
    } else if (password.trim().length < 6) {
      nextErrors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const ok = await loginAcademic(trimmedEmail, password);
    setSubmitting(false);
    if (!ok && pendingVerificationEmail) {
      setActiveModal('verify');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (regName.trim().length < 2) {
      setRegError('Informe seu nome completo.');
      return;
    }
    if (!/^[^@]+@[^@]+\.edu\.br$/i.test(regEmail.trim())) {
      setRegError('Somente e-mail institucional terminado em .edu.br é aceito.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (regCourse.trim().length < 2) {
      setRegError('Informe seu curso e turno (ex: Engenharia · Noite).');
      return;
    }
    if (!regLgpd) {
      setRegError('Aceite os Termos de Uso e Política de Privacidade (LGPD).');
      return;
    }
    if (!regDestLocation || !regDestLabel.trim()) {
      setRegError('Pesquise e selecione seu destino habitual na lista de sugestões.');
      return;
    }

    setRegLoading(true);
    const res = await signUpAcademic({
      fullName: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      courseInfo: regCourse.trim(),
      campusId: regCampusId,
      phone: regPhone.trim(),
      destinationLabel: regDestLocation.name || regDestLabel.trim(),
      destinationLat: regDestLocation.lat,
      destinationLng: regDestLocation.lng,
      destinationLocation: regDestLocation,
      classEndTime: regClassEnd,
      lgpdAccepted: regLgpd,
    });
    setRegLoading(false);

    if (!res.ok) {
      setRegError(res.error || 'Não foi possível concluir o cadastro.');
      return;
    }
    setEmail(regEmail.trim());
    setPassword(regPassword);
    setVerifyFeedback('Link de confirmação enviado para o seu e-mail acadêmico.');
    setActiveModal('verify');
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryErr(null);
    setRecoveryMsg(null);
    const targetEmail = (recoveryEmail || email).trim();
    const res = await resetPasswordAcademic(targetEmail);
    if (res.ok) {
      setRecoveryMsg(`Instruções enviadas para ${targetEmail}. Verifique sua caixa de entrada.`);
    } else {
      setRecoveryErr(res.error || 'Erro ao enviar e-mail de redefinição.');
    }
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
                  if (authError) clearAuthError();
                }}
                placeholder="voce@ucsal.edu.br"
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
                  if (authError) clearAuthError();
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

          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => {
                setRecoveryEmail(email);
                setRecoveryMsg(null);
                setRecoveryErr(null);
                setActiveModal('forgot');
              }}
              className="text-[13.5px] font-bold text-[#C51557] dark:text-[#FF558C] hover:opacity-80 cursor-pointer"
            >
              Esqueci minha senha
            </button>
          </div>

          {authError && (
            <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] px-3.5 py-2.5 text-[12.5px] font-semibold mb-3">
              {authError}
              {pendingVerificationEmail && (
                <button
                  type="button"
                  onClick={() => setActiveModal('verify')}
                  className="block underline font-bold mt-1 cursor-pointer"
                >
                  Confirmar e-mail agora
                </button>
              )}
            </div>
          )}

          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Validando acesso...' : 'Entrar com minha conta'}
          </PrimaryButton>

          <p className="text-center text-[14.5px] text-[#102536] dark:text-[#E2E8F0] mt-5">
            <span className="font-medium">Primeira vez?</span>{' '}
            <button
              type="button"
              onClick={() => {
                setRegError(null);
                setActiveModal('register');
              }}
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

      {/* Password Recovery Modal */}
      <ModalSheet
        open={activeModal === 'forgot'}
        onClose={() => setActiveModal(null)}
        title="Recuperar acesso"
        subtitle="Enviaremos um link oficial para o seu e-mail .edu.br"
      >
        <form onSubmit={handleResetSubmit} className="space-y-3">
          <div className="h-[50px] px-4 rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] flex items-center gap-3">
            <Mail className="w-[18px] h-[18px] text-[#596579] dark:text-[#94A3B8] shrink-0" />
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="voce@ucsal.edu.br"
              className="w-full bg-transparent text-[14px] font-semibold text-[#102536] dark:text-white focus:outline-none"
            />
          </div>

          {recoveryErr && (
            <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] px-3.5 py-2.5 text-[12.5px] font-semibold">
              {recoveryErr}
            </div>
          )}

          {recoveryMsg && (
            <div className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] px-3.5 py-2.5 text-[12.5px] font-semibold">
              {recoveryMsg}
            </div>
          )}

          <PrimaryButton type="submit">Enviar link de redefinição</PrimaryButton>
        </form>
      </ModalSheet>

      {/* Full Institutional Registration Modal */}
      <ModalSheet
        open={activeModal === 'register'}
        onClose={() => setActiveModal(null)}
        title="Criar conta acadêmica"
        subtitle="Acesso exclusivo com e-mail institucional .edu.br"
      >
        <form onSubmit={handleSignUpSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
              Nome completo
            </label>
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Ex: Lucas Santana"
              className="w-full h-[46px] px-3.5 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] font-medium text-[#102536] dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
              E-mail institucional (.edu.br)
            </label>
            <input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="nome@ucsal.edu.br"
              className="w-full h-[46px] px-3.5 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] font-medium text-[#102536] dark:text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
                Senha (mín. 6)
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••"
                className="w-full h-[46px] px-3.5 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] text-[#102536] dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
                Término da aula
              </label>
              <select
                value={regClassEnd}
                onChange={(e) => setRegClassEnd(e.target.value)}
                className="w-full h-[46px] px-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] font-semibold text-[#102536] dark:text-white focus:outline-none"
              >
                {CLASS_END_TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
              Curso e turno
            </label>
            <input
              type="text"
              value={regCourse}
              onChange={(e) => setRegCourse(e.target.value)}
              placeholder="Ex: Engenharia de Software · Noite"
              className="w-full h-[46px] px-3.5 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] font-medium text-[#102536] dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
              Campus de origem (Salvador)
            </label>
            <select
              value={regCampusId}
              onChange={(e) => setRegCampusId(e.target.value)}
              className="w-full h-[46px] px-3 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[13.5px] font-semibold text-[#102536] dark:text-white focus:outline-none"
            >
              {SALVADOR_CAMPUSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <LocationSearchInput
              label="Destino habitual padrão"
              placeholder="Pesquise bairro, rua, ponto de referência..."
              value={regDestLabel}
              selectedLocation={regDestLocation}
              onTextChange={(val) => {
                setRegDestLabel(val);
                if (
                  regDestLocation &&
                  regDestLocation.name !== val &&
                  regDestLocation.label !== val
                ) {
                  setRegDestLocation(null);
                }
              }}
              onSelectLocation={(loc) => {
                setRegDestLocation(loc);
                setRegDestLabel(loc.name || loc.label);
              }}
              onClear={() => {
                setRegDestLabel('');
                setRegDestLocation(null);
              }}
              required
              helperText="Sugestões dinâmicas via OpenRouteService para Salvador e RMS."
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
              Telefone (opcional · uso privado)
            </label>
            <input
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="(71) 99999-0000"
              className="w-full h-[46px] px-3.5 rounded-[12px] bg-[#EEF2F6] dark:bg-[#282E40] text-[14px] font-medium text-[#102536] dark:text-white focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2.5 text-[12px] leading-[1.45] text-[#596579] dark:text-[#A8B3C7] pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={regLgpd}
              onChange={(e) => setRegLgpd(e.target.checked)}
              className="mt-0.5 rounded accent-[#00D2FF]"
            />
            <span>
              Concordo com os Termos de Uso e Política de Privacidade (LGPD). Comprovantes Pix são excluídos automaticamente em 7 dias (RNF01) e minha localização é compartilhada apenas durante a corrida ativa.
            </span>
          </label>

          {regError && (
            <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] px-3.5 py-2.5 text-[12.5px] font-semibold">
              {regError}
            </div>
          )}

          <PrimaryButton type="submit" disabled={regLoading}>
            {regLoading ? 'Criando conta...' : 'Cadastrar com e-mail .edu.br'}
          </PrimaryButton>
        </form>
      </ModalSheet>

      {/* Email Verification Pending Modal */}
      <ModalSheet
        open={activeModal === 'verify'}
        onClose={() => setActiveModal(null)}
        title="Confirme seu e-mail .edu.br"
        subtitle="Verificação obrigatória para acessar grupos"
      >
        <div className="rounded-[16px] bg-[#E1F7FC] dark:bg-[#133342] p-4 mb-4">
          <p className="text-[13.5px] leading-[1.5] text-[#102536] dark:text-white">
            Enviamos um link de verificação para{' '}
            <span className="font-bold">
              {pendingVerificationEmail || email}
            </span>
            . Abra o link no seu e-mail institucional e depois toque abaixo.
          </p>
        </div>

        {verifyFeedback && (
          <div className="rounded-[12px] bg-[#E5F6EF] dark:bg-[#18392F] text-[#137A59] dark:text-[#66DBB1] px-3.5 py-2.5 text-[12.5px] font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{verifyFeedback}</span>
          </div>
        )}

        {authError && (
          <div className="rounded-[12px] bg-[#FDEAF1] dark:bg-[#3B2034] text-[#C51557] dark:text-[#FF6A9B] px-3.5 py-2.5 text-[12.5px] font-semibold mb-3">
            {authError}
          </div>
        )}

        <PrimaryButton
          disabled={checkingVerify}
          onClick={async () => {
            setVerifyFeedback(null);
            clearAuthError();
            setCheckingVerify(true);
            const verified = await checkEmailVerifiedNow();
            setCheckingVerify(false);
            if (verified) {
              setActiveModal(null);
            }
          }}
          className="mb-3"
        >
          {checkingVerify ? 'Verificando acesso...' : 'Já confirmei meu e-mail'}
        </PrimaryButton>

        <button
          type="button"
          onClick={async () => {
            const msg = await resendVerificationEmail();
            setVerifyFeedback(msg);
          }}
          className="w-full py-2.5 text-[13.5px] font-bold text-[#102536] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Reenviar e-mail de verificação
        </button>
      </ModalSheet>

      {/* Academic Verification Shield Info */}
      <ModalSheet
        open={activeModal === 'shield'}
        onClose={() => setActiveModal(null)}
        title="Verificação acadêmica"
        subtitle="Comunidade exclusiva para estudantes"
      >
        <p className="text-[14px] leading-[1.5] text-[#596579] dark:text-[#A8B3C7] mb-4">
          O acesso ao BoraJunto exige vínculo institucional com e-mail{' '}
          <span className="font-semibold text-[#102536] dark:text-white">
            .edu.br
          </span>{' '}
          devidamente verificado (RF01) para garantir segurança entre estudantes.
        </p>
        <PrimaryButton onClick={() => setActiveModal(null)}>
          Entendi
        </PrimaryButton>
      </ModalSheet>
    </div>
  );
};
