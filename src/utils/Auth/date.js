// src/utils/date.js
import dayjs from '@/plugins/dayjs';

// datetime ISO UTC -> objeto no fuso padrão
export const dateTime = (isoUtc) => dayjs(isoUtc).tz();

// date-only 'YYYY-MM-DD' -> dia local (aniversário)
export const dateOnly = (dateOnly) => dayjs.tz(dateOnly, 'YYYY-MM-DD');

export const nowLocal = () => dayjs().tz();
