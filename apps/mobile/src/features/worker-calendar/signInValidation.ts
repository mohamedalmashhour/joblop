export function validateWorkerSignInInput(email: string, password: string) {
  const normalizedEmail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalizedEmail)) {
    return "Enter a valid email address.";
  }
  if (!password) return "Enter your password.";
  return null;
}
