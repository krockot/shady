/// <reference path="../index.d.ts" />

// TODO: polyfill when Crypto impl is not available
export const randomUUID = () => crypto.randomUUID();
