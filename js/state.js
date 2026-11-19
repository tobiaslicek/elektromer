export const DEFAULTS = { priceT1: 4, priceT2: 3.5, fixedMonthly: 0, hasHydronic: false, hasChimney: true, woodPrice: 1900, reminderDay: 15, advance: 0 };

export const state = { readings: [], settings: { ...DEFAULTS }, loaded: false, db: null, sample: null, canImages: false, unit: "kwh", tab: "prehled", sel: {} };
