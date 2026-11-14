import { GEAR_DEFAULTS } from '../data/gear';

/* Каталог эффектов (кассеты, насадки, вживляемое и накладное). В базе тут
   жил каталог черт; механизм тот же: App подставляет каталог мира через
   setTraits(), иначе берётся встроенный. */
let _gear = null;
export function setTraits(t) {
  _gear = (t && typeof t === 'object' && !Array.isArray(t) && (t.cassettes || t.tips || t.implants)) ? {
    cassettes: Array.isArray(t.cassettes) ? t.cassettes : GEAR_DEFAULTS.cassettes,
    tips: Array.isArray(t.tips) ? t.tips : GEAR_DEFAULTS.tips,
    implants: Array.isArray(t.implants) ? t.implants : GEAR_DEFAULTS.implants,
  } : null;
}
export function getTraits() { return _gear || GEAR_DEFAULTS; }
