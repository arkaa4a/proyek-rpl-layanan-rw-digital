import fs from 'fs';
import path from 'path';

console.log("=== Uji Simulasi Logika Role Berdasarkan Source Code ===");
console.log("Membaca file actions.ts...");

try {
  const filePath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'layanan', 'actions.ts');
  const code = fs.readFileSync(filePath, 'utf-8');

  // Regex to extract the constant
  const regex = /const\s+AUTHORIZED_RW_ROLES\s*=\s*(\[[^\]]+\]);/;
  const match = code.match(regex);

  if (!match) {
    console.error("Gagal: Konstanta AUTHORIZED_RW_ROLES tidak ditemukan atau formatnya tidak sesuai.");
    process.exit(1);
  }

  // Eval the extracted array
  let authorizedRoles;
  try {
    authorizedRoles = eval(match[1]);
  } catch (err) {
    console.error("Gagal: Format array tidak dapat diekstrak menjadi objek native.", err);
    process.exit(1);
  }

  if (!Array.isArray(authorizedRoles)) {
    console.error("Gagal: Hasil ekstraksi bukan berupa array.");
    process.exit(1);
  }

  // Verifikasi bahwa daftar role aktual benar-benar sesuai 
  const expectedRoles = ['SUPER_ADMIN', 'ADMIN_RW', 'KETUA_RW'];
  const hasSameRoles = expectedRoles.length === authorizedRoles.length && 
                       expectedRoles.every(r => authorizedRoles.includes(r));
  if (!hasSameRoles) {
    console.error(`Gagal: Daftar role aktual (${JSON.stringify(authorizedRoles)}) tidak sesuai dengan yang diharapkan.`);
    process.exit(1);
  }

  console.log(`Berhasil mengekstrak role: ${JSON.stringify(authorizedRoles)}\n`);
  console.log("--- Memulai Skenario Pengujian ---");

  const scenarios = [
    { role: 'SUPER_ADMIN', expected: true },
    { role: 'ADMIN_RW', expected: true },
    { role: 'KETUA_RW', expected: true },
    { role: 'KETUA_RT', expected: false },
    { role: 'WARGA', expected: false },
    { role: '', expected: false },
    { role: undefined, expected: false }
  ];

  let passed = 0;
  for (const s of scenarios) {
    const result = authorizedRoles.includes(s.role);
    const success = result === s.expected;
    const roleStr = s.role === undefined ? 'undefined' : (s.role === '' ? '"" (Empty String)' : s.role);
    
    console.log(`Skenario [Role: ${roleStr.padEnd(17)}] -> Hasil aktual: ${String(result).padEnd(5)} | Ekspektasi: ${String(s.expected).padEnd(5)} | ${success ? '✅ PASSED' : '❌ FAILED'}`);
    if (success) passed++;
  }

  console.log("\nRingkasan Uji:");
  console.log(`Berhasil ${passed}/${scenarios.length} skenario.`);
  
  if (passed !== scenarios.length) {
    process.exit(1);
  } else {
    console.log("\nPeringatan: Ini adalah uji simulasi logika role terisolasi. Ini bukan integration test atau audit keamanan menyeluruh.");
  }

} catch (err) {
  console.error("Terjadi kesalahan sistem saat menjalankan pengujian:", err);
  process.exit(1);
}
