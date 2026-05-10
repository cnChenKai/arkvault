// services/PasswordGenerator.ts
// Cryptographically secure password generation.

import { generateRandomBytes } from '../crypto/CryptoService';

const UPPERCASE: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE: string = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS: string = '0123456789';
const SYMBOLS: string = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS: string = 'Il1O0';

export interface GeneratorOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 20,
  useUppercase: true,
  useLowercase: true,
  useDigits: true,
  useSymbols: true,
  excludeAmbiguous: false
};

/**
 * Generate a random password based on the given options.
 */
export function generatePassword(options: GeneratorOptions): string {
  let charset: string = '';

  if (options.useUppercase) {
    charset += UPPERCASE;
  }
  if (options.useLowercase) {
    charset += LOWERCASE;
  }
  if (options.useDigits) {
    charset += DIGITS;
  }
  if (options.useSymbols) {
    charset += SYMBOLS;
  }

  if (charset.length === 0) {
    charset = LOWERCASE + DIGITS;
  }

  if (options.excludeAmbiguous) {
    for (let i: number = 0; i < AMBIGUOUS.length; i++) {
      charset = charset.replace(AMBIGUOUS[i], '');
    }
  }

  const randomBytes: Uint8Array = generateRandomBytes(options.length);
  let result: string = '';
  for (let i: number = 0; i < options.length; i++) {
    result += charset[randomBytes[i] % charset.length];
  }

  return result;
}

/**
 * Calculate password strength score (0-100).
 */
export function calculateStrength(password: string): number {
  if (password.length === 0) {
    return 0;
  }

  let score: number = 0;

  // Length score (up to 40 points)
  score += Math.min(password.length * 2, 40);

  // Character variety (up to 40 points)
  const hasUpper: boolean = /[A-Z]/.test(password);
  const hasLower: boolean = /[a-z]/.test(password);
  const hasDigit: boolean = /[0-9]/.test(password);
  const hasSymbol: boolean = /[^A-Za-z0-9]/.test(password);
  const variety: number = (hasUpper ? 10 : 0) + (hasLower ? 10 : 0) +
    (hasDigit ? 10 : 0) + (hasSymbol ? 10 : 0);
  score += variety;

  // Entropy bonus (up to 20 points)
  const uniqueChars: Set<string> = new Set(password.split(''));
  score += Math.min(uniqueChars.size, 20);

  return Math.min(score, 100);
}

/**
 * Get strength label.
 */
export function getStrengthLabel(score: number): string {
  if (score < 30) {
    return '弱';
  }
  if (score < 60) {
    return '中';
  }
  if (score < 80) {
    return '强';
  }
  return '极强';
}
