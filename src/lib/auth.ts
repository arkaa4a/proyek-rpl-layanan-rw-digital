import { cookies } from "next/headers";
import { cache } from "react";
import prisma from "./db";
import { encrypt, decrypt, SessionPayload } from "./session";

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 Hari
  const session = await encrypt(payload);

  (await cookies()).set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  (await cookies()).delete("session");
}

export const getSession = cache(async () => {
  let session: string | undefined;
  try {
    session = (await cookies()).get("session")?.value;
  } catch {
    session = (globalThis as any).__TEST_SESSION_COOKIE__;
  }
  if (!session) return null;
  
  const payload = await decrypt(session);
  if (!payload) return null;

  // Verifikasi ke database (cached per request)
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { role: true }
  });

  if (!user || !user.isActive) {
    return null; // Token tidak valid atau akun dinonaktifkan
  }

  // Segarkan klaim sesi dari database agar selalu akurat
  return {
    ...payload,
    role: user.role.name,
    rwId: user.rwId,
    rtId: user.rtId,
    wargaId: user.wargaId,
  } as SessionPayload;
});

// Helper untuk Role Checking
export const checkRole = (userRole: string, allowedRoles: string[]) => {
  return allowedRoles.includes(userRole);
};
