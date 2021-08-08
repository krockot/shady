declare global {
  interface Crypto {
    // Relatively new in Chrome (M92)
    randomUUID: () => string;
  }

  interface Window {
    ballAss: string;
  }
}

export {};
