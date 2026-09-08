import { useAuthStore } from "@/core/store/useAuthStore";

/**
 * Extracts the dial code (e.g., "+234", "+1") from an E.164 phone number.
 */
export function extractCountryCode(phoneNumber?: string | null): string | null {
  if (!phoneNumber || !phoneNumber.startsWith("+")) return null;
  const match = phoneNumber.match(/^\+(\d{1,4})/);
  return match ? `+${match[1]}` : null;
}

/**
 * Normalizes a raw phone number into E.164 international format (+XXXXXXXXXXX).
 * Uses the logged-in user's country dial code as fallback for local numbers.
 */
export function normalizePhoneNumber(
  rawNumber: string,
  fallbackCountryCode?: string | null
): string | null {
  if (!rawNumber) return null;

  // Reject numbers containing service characters (*, #) or letters
  if (/[*#a-zA-Z]/.test(rawNumber)) return null;

  // 1. Remove all whitespace, dashes, parentheses, dots
  let cleaned = rawNumber.trim().replace(/[\s\-().]/g, "");

  // 2. Replace international prefix "00" with "+"
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  const userPhone = useAuthStore.getState().user?.phoneNumber;
  const defaultCountryCode =
    fallbackCountryCode || extractCountryCode(userPhone) || "+234";
  const defaultCodeWithoutPlus = defaultCountryCode.replace("+", "");

  let e164Candidate = "";

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1).replace(/\D/g, "");
    e164Candidate = `+${digits}`;
  } else {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 0) return null;

    // If contact was saved with country code but missing "+" (e.g. "2348012345678")
    if (
      digits.startsWith(defaultCodeWithoutPlus) &&
      digits.length >= defaultCodeWithoutPlus.length + 9
    ) {
      e164Candidate = `+${digits}`;
    } else if (digits.startsWith("0")) {
      // Local trunk "0" (e.g. "08012345678" -> "+2348012345678")
      e164Candidate = `${defaultCountryCode}${digits.slice(1)}`;
    } else {
      // Local number without trunk (e.g. "8012345678" -> "+2348012345678")
      e164Candidate = `${defaultCountryCode}${digits}`;
    }
  }

  // 3. Strict E.164 format: must start with + and a non-zero digit
  if (!/^\+[1-9]\d{6,14}$/.test(e164Candidate)) {
    return null;
  }

  // 4. Country-specific validation rules
  // Nigeria (+234): Mobile numbers have exactly 10 digits after +234, starting with 7, 8, or 9
  if (e164Candidate.startsWith("+234")) {
    const digitsAfter234 = e164Candidate.slice(4);
    if (!/^[789]\d{9}$/.test(digitsAfter234)) {
      return null;
    }
  }

  // Overall E.164 length check (international numbers are generally 10 to 15 digits)
  if (e164Candidate.length < 11 || e164Candidate.length > 16) {
    return null;
  }

  return e164Candidate;
}

/**
 * Deduplicates and normalizes a list of phone numbers.
 */
export function normalizePhoneNumbers(numbers: string[]): string[] {
  const unique = new Set<string>();

  for (const num of numbers) {
    const normalized = normalizePhoneNumber(num);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}
