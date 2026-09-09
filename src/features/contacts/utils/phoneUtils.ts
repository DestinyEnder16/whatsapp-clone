import { useAuthStore } from "@/core/store/useAuthStore";

/**
 * Extracts the international dial code (e.g., "+234", "+1", "+44") from an E.164 phone number.
 *
 * Why this is needed:
 * When a user enters a local phone number in their address book (e.g., "08012345678"),
 * we need to know what country code to assume. The best guess is the country code of the
 * currently logged-in user. This helper extracts that dial code from the user's phone number.
 *
 * @param phoneNumber - An E.164 formatted phone number (e.g., "+2348012345678")
 * @returns Dial code string (e.g., "+234") or null if invalid/missing
 */
export function extractCountryCode(phoneNumber?: string | null): string | null {
  if (!phoneNumber || !phoneNumber.startsWith("+")) return null;
  // Match '+' followed by 1 to 4 digits (standard ITU-T E.164 country code range)
  const match = phoneNumber.match(/^\+(\d{1,4})/);
  return match ? `+${match[1]}` : null;
}

/**
 * Normalizes a raw phone number from the device address book into strict E.164 international format (+XXXXXXXXXXX).
 *
 * Problem:
 * Phone numbers stored on mobile devices vary wildly in format:
 * - Local with trunk zero: "0801 234 5678"
 * - Local without trunk: "801 234 5678"
 * - International with dial code missing '+': "2348012345678"
 * - International with '00' prefix: "002348012345678"
 * - Punctuation & spacing: "(080) 123-4567"
 * - USSD / Short codes: "*123#", "MTN Care"
 *
 * Solution:
 * This function cleans, standardizes, validates, and transforms any valid phone number
 * into the uniform E.164 standard required by the backend match API.
 *
 * @param rawNumber - Raw phone string from the device contacts
 * @param fallbackCountryCode - Optional dial code override (e.g., "+234")
 * @returns Standardized E.164 string (e.g., "+2348012345678") or null if invalid
 */
export function normalizePhoneNumber(
  rawNumber: string,
  fallbackCountryCode?: string | null
): string | null {
  if (!rawNumber) return null;

  // Step 1: Reject non-phone inputs (USSD codes like *123#, short codes with #, or text names)
  if (/[*#a-zA-Z]/.test(rawNumber)) return null;

  // Step 2: Strip non-numeric formatting characters (spaces, dashes, parens, dots)
  let cleaned = rawNumber.trim().replace(/[\s\-().]/g, "");

  // Step 3: Replace international direct dialing prefix "00" with "+" (e.g., "00234..." -> "+234...")
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // Step 4: Determine the fallback country dial code
  // Priority: 1. Explicit argument -> 2. Current user's country code -> 3. Default to Nigeria (+234)
  const userPhone = useAuthStore.getState().user?.phoneNumber;
  const defaultCountryCode =
    fallbackCountryCode || extractCountryCode(userPhone) || "+234";
  const defaultCodeWithoutPlus = defaultCountryCode.replace("+", "");

  let e164Candidate = "";

  if (cleaned.startsWith("+")) {
    // Already has leading '+': keep '+' and strip any remaining non-digit characters
    const digits = cleaned.slice(1).replace(/\D/g, "");
    e164Candidate = `+${digits}`;
  } else {
    // Number lacks '+'. We need to convert it based on local vs international notation:
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 0) return null;

    // Case A: Number was saved with full country code but without '+' (e.g., "2348012345678")
    if (
      digits.startsWith(defaultCodeWithoutPlus) &&
      digits.length >= defaultCodeWithoutPlus.length + 9
    ) {
      e164Candidate = `+${digits}`;
    } else if (digits.startsWith("0")) {
      // Case B: Local format with domestic trunk zero (e.g., "08012345678" -> strip '0' -> "+2348012345678")
      e164Candidate = `${defaultCountryCode}${digits.slice(1)}`;
    } else {
      // Case C: Local format without trunk zero (e.g., "8012345678" -> "+2348012345678")
      e164Candidate = `${defaultCountryCode}${digits}`;
    }
  }

  // Step 5: Strict E.164 format verification
  // Must start with '+' followed by a non-zero digit, with 7 to 15 digits total length
  if (!/^\+[1-9]\d{6,14}$/.test(e164Candidate)) {
    return null;
  }

  // Step 6: Country-specific business logic rules
  // Nigeria (+234): Mobile numbers have exactly 10 digits after +234, starting with 7, 8, or 9
  // (e.g., MTN, Airtel, Glo, 9mobile prefixes: 080..., 081..., 070..., 090..., 091...)
  if (e164Candidate.startsWith("+234")) {
    const digitsAfter234 = e164Candidate.slice(4);
    if (!/^[789]\d{9}$/.test(digitsAfter234)) {
      return null;
    }
  }

  // Overall E.164 sanity length check (international numbers are generally 10 to 15 digits total)
  if (e164Candidate.length < 11 || e164Candidate.length > 16) {
    return null;
  }

  return e164Candidate;
}

/**
 * Normalizes an array of raw phone numbers, automatically filtering out invalid numbers
 * and eliminating duplicates.
 *
 * Why deduplication is critical:
 * 1. Contacts often have the same number stored multiple times (e.g., "Work" & "Mobile").
 * 2. Deduplication minimizes payload size sent to the backend `/v1/contacts/match` endpoint.
 *
 * @param numbers - Array of raw phone strings from device contacts
 * @returns Array of unique, valid E.164 phone numbers
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

