import { z } from 'zod';

// 10-128 characters with an uppercase letter, a lowercase letter, a digit and a symbol.
export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;
export const PASSWORD_POLICY_MESSAGE =
  'Password must be 10-128 characters and include an uppercase letter, a lowercase letter, a number and a symbol.';

export const strongPassword = z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE);
