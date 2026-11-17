function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizeAscii(input: string, maxLen: number): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 .\-]/g, '')
    .trim()
    .slice(0, maxLen);
}

/**
 * Generates an EMVCo BR Code (PIX Copia-e-Cola) payload with CRC16-CCITT.
 * Used exclusively as Copia-e-Cola without exposing the raw Pix key in UI.
 */
export function buildPixCopiaECola(params: {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amount: number;
  txId?: string;
}): string {
  const cleanKey = params.pixKey.trim() || 'borajunto@ucsal.edu.br';
  const cleanName = normalizeAscii(params.merchantName || 'LIDER BORAJUNTO', 25) || 'BORAJUNTO';
  const cleanCity = normalizeAscii(params.merchantCity || 'SALVADOR', 15) || 'SALVADOR';
  const cleanTxId =
    normalizeAscii(params.txId || 'BORAJUNTO', 25).replace(/\s+/g, '') || 'BORAJUNTO';

  const gui = formatTLV('00', 'br.gov.bcb.pix');
  const keyField = formatTLV('01', cleanKey.slice(0, 77));
  const merchantAccountInfo = formatTLV('26', `${gui}${keyField}`);

  const formattedAmount = Math.max(0.01, params.amount).toFixed(2);
  const additionalData = formatTLV('62', formatTLV('05', cleanTxId));

  const payloadWithoutCrc =
    formatTLV('00', '01') +
    merchantAccountInfo +
    formatTLV('52', '0000') +
    formatTLV('53', '986') +
    formatTLV('54', formattedAmount) +
    formatTLV('58', 'BR') +
    formatTLV('59', cleanName.toUpperCase()) +
    formatTLV('60', cleanCity.toUpperCase()) +
    additionalData +
    '6304';

  const crc = crc16Ccitt(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}

/**
 * Updates tag 54 (Transaction Amount) and recomputes CRC16-CCITT (tag 63)
 * on an existing EMVCo BR Code without needing the raw Pix key separately.
 */
export function repricePixCopiaECola(
  existingPayload: string,
  newAmount: number
): string {
  if (!existingPayload || !existingPayload.startsWith('000201')) {
    return buildPixCopiaECola({
      pixKey: 'borajunto@ucsal.edu.br',
      merchantName: 'BORAJUNTO',
      amount: newAmount,
    });
  }

  // Strip trailing CRC16 tag (6304XXXX)
  const crcIdx = existingPayload.lastIndexOf('6304');
  const body = crcIdx > 0 ? existingPayload.slice(0, crcIdx) : existingPayload;

  // Parse top-level TLVs to replace or insert tag 54 cleanly
  const tags: Array<{ id: string; value: string }> = [];
  let cursor = 0;
  while (cursor + 4 <= body.length) {
    const id = body.slice(cursor, cursor + 2);
    const len = Number(body.slice(cursor + 2, cursor + 4));
    if (Number.isNaN(len) || cursor + 4 + len > body.length) break;
    const value = body.slice(cursor + 4, cursor + 4 + len);
    if (id !== '54') {
      tags.push({ id, value });
    }
    cursor += 4 + len;
  }

  const formattedAmount = Math.max(0.01, newAmount).toFixed(2);
  const nextBodyParts: string[] = [];
  let inserted54 = false;
  for (const tag of tags) {
    if (!inserted54 && Number(tag.id) > 54) {
      nextBodyParts.push(formatTLV('54', formattedAmount));
      inserted54 = true;
    }
    nextBodyParts.push(formatTLV(tag.id, tag.value));
  }
  if (!inserted54) {
    nextBodyParts.push(formatTLV('54', formattedAmount));
  }

  const payloadWithoutCrc = `${nextBodyParts.join('')}6304`;
  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
