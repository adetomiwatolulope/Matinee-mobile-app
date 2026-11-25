const NAME_PATTERN = /^[A-Za-z ]+$/;
const EMAIL_PATTERN = /@.+/;
const LOWERCASE_PATTERN = /[a-z]/;
const UPPERCASE_PATTERN = /[A-Z]/;
const NUMBER_PATTERN = /[0-9]/;
const SPECIAL_PATTERN = /[#@>^]/;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 64;
const VERIFICATION_CODE_PATTERN = /^\d{6}$/;

export { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH };

export function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function formatNameInput(value) {
  return value.replace(/^ +/, '').replace(/ {2,}/g, ' ');
}

export function isNameValid(value) {
  return NAME_PATTERN.test(value) && /[A-Za-z]/.test(value);
}

export function isEmailFilled(value, mode) {
  const normalized = value.trim();
  return mode === 'register' ? EMAIL_PATTERN.test(normalized) : normalized.length > 0;
}

export function getPasswordChecklist(value) {
  const password = value.trim();
  return {
    hasLength: password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH,
    hasLower: LOWERCASE_PATTERN.test(value),
    hasUpper: UPPERCASE_PATTERN.test(value),
    hasNumber: NUMBER_PATTERN.test(value),
    hasSpecial: SPECIAL_PATTERN.test(value),
  };
}

export function isPasswordValid(value) {
  const checklist = getPasswordChecklist(value);
  return Object.values(checklist).every(Boolean);
}

export function isPasswordFilled(value) {
  return isPasswordValid(value);
}

export function canSubmitAuth({ mode, name, email, password }) {
  if (mode === 'register') {
    return Boolean(name.trim() && isNameValid(name.trim()) && isEmailFilled(email, mode) && isPasswordFilled(password));
  }
  return Boolean(isEmailFilled(email, mode) && isPasswordFilled(password));
}

export function isVerificationCodeValid(value) {
  return VERIFICATION_CODE_PATTERN.test(value.trim());
}

export function validateField(key, label, value, mode) {
  if (!value.trim()) return `${label} field cannot be empty`;
  if (key === 'name' && !isNameValid(value.trim())) return 'Name Must Use Letters';
  if (key === 'password' && !isPasswordValid(value)) {
    return 'Password does not meet requirements';
  }
  return '';
}

export function validateAuthInput(mode, name, email, password) {
  const trimmedName = name.trimEnd();
  const normalizedEmail = email.trimEnd().toLowerCase();
  const trimmedPassword = password.trimEnd();
  if (mode === 'register' && !trimmedName.trim()) return { error: 'Name is required' };
  if (!normalizedEmail.trim()) return { error: 'Email is required' };
  if (!trimmedPassword) return { error: 'Password is required' };
  if (!isPasswordValid(trimmedPassword)) {
    return { error: 'Password does not meet requirements' };
  }
  return { trimmedName, normalizedEmail, trimmedPassword };
}

export function passwordRequirementMessage(password) {
  const checklist = getPasswordChecklist(password);
  if (!checklist.hasLower) return '- Password must contain a lowercase letter';
  if (!checklist.hasUpper) return '- Password must contain an uppercase letter';
  if (!checklist.hasNumber) return '- Password must contain a number';
  if (!checklist.hasSpecial) return '- Password must contain a special character(#@>^)';
  if (!checklist.hasLength) return '- Password must be 10-64 characters';
  return '';
}
