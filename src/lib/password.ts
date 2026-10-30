import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;
// Sem caracteres parecidos (0/O, 1/l/I): a senha chega por e-mail e o cliente digita à mão.
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function generatePassword(length = 8) {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join("");
}
