import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  FileText,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { useBoraJunto } from '../context/BoraJuntoContext';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  ModerationLogEntry,
  ModerationReport,
  ModerationStatus,
  ReportStatus,
  ResolutionAction,
} from '../types';
import { formatSlaDeadlineBrt } from '../utils/sla';

function tsToMs(ts: unknown): number {
  if (ts && typeof (ts as Timestamp).toMillis === 'function') {
    return (ts as Timestamp).toMillis();
  }
  return Date.now();
}

export const AdminModerationView: React.FC = () => {
  const { isAdmin, firebaseUser, setShowAdminView } = useBoraJunto();

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [logs, setLogs] = useState<ModerationLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');

  const [draftStatus, setDraftStatus] = useState<ReportStatus>('em_analise');
  const [draftAction, setDraftAction] = useState<ResolutionAction>('none');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !firebaseUser) return;

    const unsubReports = onSnapshot(
      query(collection(db, 'reports'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list: ModerationReport[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            groupId: String(data.groupId || ''),
            reporterUid: String(data.reporterUid || ''),
            reporterName: String(data.reporterName || ''),
            reportedUid: String(data.reportedUid || ''),
            reportedName: String(data.reportedName || ''),
            category: data.category as ModerationReport['category'],
            priority:
              (data.priority as 'normal' | 'immediate_risk') || 'normal',
            description: String(data.description || ''),
            status: data.status as ReportStatus,
            resolutionAction: data.resolutionAction as ResolutionAction | undefined,
            moderatorNotes: data.moderatorNotes
              ? String(data.moderatorNotes)
              : undefined,
            contestNote: data.contestNote ? String(data.contestNote) : undefined,
            slaDeadlineAt: String(data.slaDeadlineAt || ''),
            createdAtMs: tsToMs(data.createdAt),
          };
        });
        setReports(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'moderationLogs'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list: ModerationLogEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            reportId: String(data.reportId || ''),
            moderatorUid: String(data.moderatorUid || ''),
            moderatorEmail: String(data.moderatorEmail || ''),
            previousStatus: String(data.previousStatus || ''),
            newStatus: String(data.newStatus || ''),
            actionTaken: String(data.actionTaken || ''),
            createdAtMs: tsToMs(data.createdAt),
          };
        });
        setLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'moderationLogs')
    );

    return () => {
      unsubReports();
      unsubLogs();
    };
  }, [isAdmin, firebaseUser]);

  const sortedReports = useMemo(() => {
    const filtered =
      statusFilter === 'all'
        ? reports
        : reports.filter((r) => r.status === statusFilter);

    return [...filtered].sort((a, b) => {
      if (a.priority === 'immediate_risk' && b.priority !== 'immediate_risk') {
        return -1;
      }
      if (a.priority !== 'immediate_risk' && b.priority === 'immediate_risk') {
        return 1;
      }
      return b.createdAtMs - a.createdAtMs;
    });
  }, [reports, statusFilter]);

  const selectedReport = useMemo(
    () =>
      sortedReports.find((r) => r.id === selectedId) ||
      sortedReports[0] ||
      null,
    [sortedReports, selectedId]
  );

  useEffect(() => {
    if (!selectedReport) return;
    setDraftStatus(selectedReport.status);
    setDraftAction(selectedReport.resolutionAction || 'none');
    setDraftNotes(selectedReport.moderatorNotes || '');
    setSaveMessage(null);
  }, [selectedReport?.id]);

  if (!isAdmin || !firebaseUser) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-white dark:bg-[#1E2230] border border-[#DCE3EB] dark:border-[#2C3245] text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-[#C51557] mx-auto" />
        <h1 className="text-xl font-bold text-[#102536] dark:text-white">
          Acesso restrito à moderação
        </h1>
        <p className="text-sm text-[#596579] dark:text-[#A8B3C7]">
          Apenas contas administrativas autorizadas podem acessar a fila de denúncias e auditoria.
        </p>
        <button
          type="button"
          onClick={() => setShowAdminView(false)}
          className="px-4 py-2 rounded-xl bg-[#00D2FF] text-[#102536] font-bold text-sm cursor-pointer"
        >
          Voltar ao aplicativo
        </button>
      </div>
    );
  }

  const handleApplyModeration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    if (draftNotes.trim().length < 5) {
      setSaveMessage('Informe uma justificativa com pelo menos 5 caracteres.');
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    const batch = writeBatch(db);

    batch.update(doc(db, 'reports', selectedReport.id), {
      status: draftStatus,
      resolutionAction: draftAction,
      moderatorNotes: draftNotes.trim().slice(0, 1000),
      updatedAt: serverTimestamp(),
    });

    if (
      draftAction === 'temporary_block' ||
      draftAction === 'permanent_block' ||
      draftAction === 'overturned'
    ) {
      const nextUserStatus: ModerationStatus =
        draftAction === 'overturned' ? 'active' : draftAction;
      batch.update(doc(db, 'users', selectedReport.reportedUid), {
        moderationStatus: nextUserStatus,
        moderationReason: draftNotes.trim().slice(0, 400),
        updatedAt: serverTimestamp(),
      });
    }

    const logRef = doc(collection(db, 'moderationLogs'));
    batch.set(logRef, {
      reportId: selectedReport.id,
      moderatorUid: firebaseUser.uid,
      moderatorEmail: firebaseUser.email || '',
      previousStatus: selectedReport.status,
      newStatus: draftStatus,
      actionTaken: `${draftAction}: ${draftNotes.trim().slice(0, 320)}`,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      setSaveMessage('Decisão registrada com trilha de auditoria.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reports/${selectedReport.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-5 text-[#102536] dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1E2230] p-4 rounded-2xl border border-[#DCE3EB] dark:border-[#2C3245]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-[#137A59] dark:text-[#4ADE80]" />
          <div>
            <h1 className="text-lg font-extrabold">
              Área Administrativa · Moderação e Auditoria BoraJunto
            </h1>
            <p className="text-xs text-[#596579] dark:text-[#A8B3C7]">
              SLA: 24 horas úteis (seg–sex, 08h–18h BRT) · Prioridade para risco imediato (RF11/RF13)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdminView(false)}
          className="px-3.5 py-2 rounded-xl bg-[#EEF2F6] dark:bg-[#282E40] text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à visão de estudante
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          ['all', 'pendente', 'em_analise', 'resolvida', 'arquivada'] as const
        ).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
              statusFilter === st
                ? 'bg-[#102536] text-white dark:bg-[#00D2FF] dark:text-[#102536]'
                : 'bg-white dark:bg-[#1E2230] text-[#596579] dark:text-[#A8B3C7] border border-[#DCE3EB] dark:border-[#2C3245]'
            }`}
          >
            {st === 'all' ? 'Todas' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Reports Queue */}
        <div className="lg:col-span-5 space-y-3">
          {sortedReports.length === 0 ? (
            <div className="bg-white dark:bg-[#1E2230] p-6 rounded-2xl border border-[#DCE3EB] dark:border-[#2C3245] text-sm text-[#596579] dark:text-[#A8B3C7]">
              Nenhuma denúncia registrada neste filtro.
            </div>
          ) : (
            sortedReports.map((rep) => {
              const sla = formatSlaDeadlineBrt(rep.slaDeadlineAt);
              const isSelected = selectedReport?.id === rep.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedId(rep.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#E1F7FC] dark:bg-[#133342] border-[#00D2FF]'
                      : 'bg-white dark:bg-[#1E2230] border-[#DCE3EB] dark:border-[#2C3245]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      {rep.priority === 'immediate_risk' && (
                        <AlertTriangle className="w-4 h-4 text-[#C51557]" />
                      )}
                      {rep.priority === 'immediate_risk'
                        ? 'Risco Imediato'
                        : rep.category}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EEF2F6] dark:bg-[#282E40]">
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold truncate">
                    Denunciado: {rep.reportedName}
                  </p>
                  <p className="text-xs text-[#596579] dark:text-[#A8B3C7] mt-1 line-clamp-2">
                    {rep.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span className={sla.isOverdue ? 'text-[#C51557]' : ''}>
                      SLA: {sla.formattedDate}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Report Detail + Moderation Action + Audit Logs */}
        <div className="lg:col-span-7 space-y-5">
          {selectedReport && (
            <form
              onSubmit={handleApplyModeration}
              className="bg-white dark:bg-[#1E2230] p-5 rounded-2xl border border-[#DCE3EB] dark:border-[#2C3245] space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold">
                    Ocorrência #{selectedReport.id.slice(0, 8)}
                  </h2>
                  <p className="text-xs text-[#596579] dark:text-[#A8B3C7]">
                    Denunciante: {selectedReport.reporterName} · Denunciado:{' '}
                    {selectedReport.reportedName}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FDEAF1] text-[#C51557] dark:bg-[#3B2034] dark:text-[#FF6A9B]">
                  {selectedReport.category}
                </span>
              </div>

              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#282E40] p-3.5 text-sm">
                {selectedReport.description}
              </div>

              {selectedReport.contestNote && (
                <div className="rounded-xl bg-[#E1F7FC] dark:bg-[#133342] p-3.5 text-xs space-y-1">
                  <p className="font-bold">Contestação do usuário (RF13):</p>
                  <p>{selectedReport.contestNote}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Novo status
                  </label>
                  <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value as ReportStatus)}
                    className="w-full h-10 px-3 rounded-xl bg-[#EEF2F6] dark:bg-[#282E40] text-sm font-semibold"
                  >
                    <option value="pendente">pendente</option>
                    <option value="em_analise">em_analise</option>
                    <option value="resolvida">resolvida</option>
                    <option value="arquivada">arquivada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Medida preventiva / decisão
                  </label>
                  <select
                    value={draftAction}
                    onChange={(e) =>
                      setDraftAction(e.target.value as ResolutionAction)
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#EEF2F6] dark:bg-[#282E40] text-sm font-semibold"
                  >
                    <option value="none">Nenhuma penalidade</option>
                    <option value="warning">Advertência formal</option>
                    <option value="temporary_block">
                      Bloqueio preventivo temporário
                    </option>
                    <option value="permanent_block">Bloqueio definitivo</option>
                    <option value="overturned">
                      Reverter bloqueio (contestação aceita)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Justificativa obrigatória da moderação
                </label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  rows={3}
                  placeholder="Descreva os critérios e evidências da decisão..."
                  className="w-full p-3 rounded-xl bg-[#EEF2F6] dark:bg-[#282E40] text-sm"
                />
              </div>

              {saveMessage && (
                <p className="text-xs font-bold text-[#137A59] dark:text-[#66DBB1]">
                  {saveMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-xl bg-[#00D2FF] text-[#102536] font-extrabold text-sm cursor-pointer"
              >
                {saving
                  ? 'Salvando auditoria...'
                  : 'Registrar decisão e gravar log imutável'}
              </button>
            </form>
          )}

          {/* Append-only Audit Timeline */}
          <div className="bg-white dark:bg-[#1E2230] p-5 rounded-2xl border border-[#DCE3EB] dark:border-[#2C3245] space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#596579]" />
              <h3 className="text-sm font-extrabold">
                Trilha de Auditoria Imutável (moderationLogs)
              </h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-xs text-[#596579] dark:text-[#A8B3C7]">
                  Nenhuma ação de moderação registrada ainda.
                </p>
              ) : (
                logs.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#282E40] text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold">
                      <span>
                        Denúncia #{l.reportId.slice(0, 8)} ({l.previousStatus} →{' '}
                        {l.newStatus})
                      </span>
                      <span>
                        {new Date(l.createdAtMs).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-[#596579] dark:text-[#CBD5E1]">
                      {l.actionTaken} · por {l.moderatorEmail}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
