import { jwtVerify, SignJWT } from "jose";

// Pastikan untuk mengganti secret ini via env di production
const JWT_SECRET_KEY = process.env.JWT_SECRET || "super-secret-key-untuk-dev-lingkungan-rw";
const encodedKey = new TextEncoder().encode(JWT_SECRET_KEY);

export type SessionPayload = {
  id: string;
  username: string;
  role: string;
  rwId?: string | null;
  rtId?: string | null;
  wargaId?: string | null;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}
