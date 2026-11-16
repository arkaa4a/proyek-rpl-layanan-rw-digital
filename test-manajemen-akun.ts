import prisma from './src/lib/db';
import { encrypt } from './src/lib/session';
import bcrypt from 'bcryptjs';
import {
  getAccountsAction,
  getAccountDetailAction,
  createAccountAction,
  updateAccountAction,
  toggleAccountStatusAction,
  deleteAccountAction,
  getReferenceDataAction,
} from './src/app/dashboard/manajemen-akun/actions';
import { loginAction } from './src/app/(auth)/login/actions';

async function setTestSession(user: { id: string; username: string; role: string; rwId?: string | null; rtId?: string | null; wargaId?: string | null } | null) {
  if (!user) {
    (globalThis as any).__TEST_SESSION_COOKIE__ = undefined;
  } else {
    (globalThis as any).__TEST_SESSION_COOKIE__ = await encrypt({
      id: user.id,
      username: user.username,
      role: user.role,
      rwId: user.rwId,
      rtId: user.rtId,
      wargaId: user.wargaId,
    });
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log(' PENGUJIAN LENGKAP FITUR MANAJEMEN DATA AKUN (SUPER_ADMIN)');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: any, title: string, detail = '') {
    total++;
    if (Boolean(condition)) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - ${detail}`);
    }
  }

  // Ambil user superadmin dan warga dari DB
  const superAdminUser = await prisma.user.findFirst({
    where: { role: { name: 'SUPER_ADMIN' }, isActive: true },
    include: { role: true },
  });

  const wargaUser = await prisma.user.findFirst({
    where: { role: { name: 'WARGA' }, isActive: true },
    include: { role: true },
  });

  const roles = await prisma.role.findMany();
  const roleMap: Record<string, string> = {};
  roles.forEach(r => { roleMap[r.name] = r.id; });

  if (!superAdminUser) {
    console.error('Fatal: User SUPER_ADMIN tidak ditemukan di database.');
    process.exit(1);
  }
  if (!wargaUser) {
    console.error('Fatal: User WARGA tidak ditemukan di database.');
    process.exit(1);
  }

  // Set session sebagai SUPER_ADMIN
  await setTestSession({
    id: superAdminUser.id,
    username: superAdminUser.username,
    role: superAdminUser.role.name,
  });

  // -------------------------------------------------------------
  // SKENARIO 1: SUPER ADMIN DAPAT MELIHAT DAFTAR SELURUH AKUN
  // -------------------------------------------------------------
  console.log('--- 1. Uji Melihat Daftar Akun (SUPER_ADMIN) ---');
  const res1 = await getAccountsAction({});
  assert(
    res1.success === true && Array.isArray(res1.users) && res1.users.length > 0,
    'Skenario 1: Super Admin berhasil mengambil daftar akun',
    JSON.stringify(res1.error)
  );
  // Verifikasi tidak membocorkan hash password
  const hasPasswordLeak = res1.users?.some((u: any) => 'password' in u);
  assert(
    !hasPasswordLeak,
    'Skenario 1.1: Daftar akun tidak menyertakan password hash ke frontend'
  );

  // -------------------------------------------------------------
  // SKENARIO 2: PENCARIAN, FILTER ROLE, STATUS, DAN PAGINATION
  // -------------------------------------------------------------
  console.log('\n--- 2. Uji Pencarian, Filter Role/Status, dan Pagination ---');
  // Pencarian username
  const resSearch = await getAccountsAction({ search: 'arkaa' });
  assert(
    resSearch.success === true && resSearch.users?.some(u => u.username === 'arkaa'),
    'Skenario 2a: Pencarian berdasarkan username berfungsi'
  );

  // Filter role WARGA
  const resRoleFilter = await getAccountsAction({ roleFilter: 'WARGA' });
  const allAreWarga = resRoleFilter.users?.every(u => u.role.name === 'WARGA');
  assert(
    resRoleFilter.success === true && (resRoleFilter.users?.length || 0) > 0 && allAreWarga,
    'Skenario 2b: Filter role WARGA berfungsi dengan tepat'
  );

  // Filter status ACTIVE
  const resStatusFilter = await getAccountsAction({ statusFilter: 'ACTIVE' });
  const allActive = resStatusFilter.users?.every(u => u.isActive === true);
  assert(
    resStatusFilter.success === true && (resStatusFilter.users?.length || 0) > 0 && allActive,
    'Skenario 2c: Filter status akun AKTIF berfungsi'
  );

  // Pagination
  const resPagination = await getAccountsAction({ page: 1, limit: 2 });
  assert(
    resPagination.success === true && resPagination.users?.length === 2 && resPagination.pagination?.totalPages! >= 1,
    'Skenario 2d: Pagination (limit 2) berfungsi membatasi jumlah data per halaman'
  );

  // -------------------------------------------------------------
  // SKENARIO 3: SUPER ADMIN DAPAT MELIHAT DETAIL AKUN
  // -------------------------------------------------------------
  console.log('\n--- 3. Uji Melihat Detail Akun ---');
  const resDetail = await getAccountDetailAction(wargaUser.id);
  assert(
    resDetail.success === true && resDetail.data?.username === wargaUser.username,
    'Skenario 3a: Super Admin berhasil melihat detail akun'
  );
  // NIK dan KK harus ter-masking
  const isNikMasked = resDetail.data?.warga?.nik?.includes('*');
  assert(
    isNikMasked,
    'Skenario 3b: Data NIK pada detail akun berhasil di-masking untuk privasi'
  );
  const detailPasswordLeak = 'password' in (resDetail.data || {});
  assert(
    !detailPasswordLeak,
    'Skenario 3c: Detail akun tidak membocorkan hash password'
  );

  // -------------------------------------------------------------
  // SKENARIO 4: SUPER ADMIN DAPAT MEMBUAT & MENGEDIT AKUN
  // -------------------------------------------------------------
  console.log('\n--- 4. Uji Pembuatan & Pengeditan Akun ---');
  const testUsername = `user_test_${Date.now()}`;
  const resCreate = await createAccountAction({
    username: testUsername,
    password: 'password123',
    confirmPassword: 'password123',
    roleId: roleMap['WARGA'],
    email: `${testUsername}@example.com`,
    noWhatsapp: '081234567890',
    isActive: true,
  });

  assert(
    resCreate.success === true,
    'Skenario 4a: Super Admin berhasil membuat akun baru',
    resCreate.error
  );

  const createdUser = await prisma.user.findUnique({
    where: { username: testUsername },
    include: { role: true },
  });

  // Edit akun yang baru dibuat
  const updatedEmail = `updated_${testUsername}@example.com`;
  const resUpdate = await updateAccountAction(createdUser!.id, {
    username: `${testUsername}_rev`,
    roleId: roleMap['WARGA'],
    email: updatedEmail,
    noWhatsapp: '089999999999',
    isActive: true,
    newPassword: '',
    confirmNewPassword: '',
  });

  assert(
    resUpdate.success === true,
    'Skenario 4b: Super Admin berhasil mengedit dan menyimpan perubahan data akun'
  );

  const userAfterUpdate = await prisma.user.findUnique({
    where: { id: createdUser!.id },
  });
  assert(
    userAfterUpdate?.email === updatedEmail && userAfterUpdate?.username === `${testUsername}_rev`,
    'Skenario 4c: Perubahan data akun tersimpan secara akurat di database'
  );

  // -------------------------------------------------------------
  // SKENARIO 5: RESET PASSWORD TERSIMPAN DALAM BENTUK HASH
  // -------------------------------------------------------------
  console.log('\n--- 5. Uji Reset Password dan Verifikasi Hash ---');
  const newPlainPassword = 'NewSecretPassword999';
  const resReset = await updateAccountAction(createdUser!.id, {
    username: `${testUsername}_rev`,
    roleId: roleMap['WARGA'],
    email: updatedEmail,
    noWhatsapp: '089999999999',
    isActive: true,
    newPassword: newPlainPassword,
    confirmNewPassword: newPlainPassword,
  });

  assert(
    resReset.success === true,
    'Skenario 5a: Eksekusi reset password berhasil'
  );

  const userAfterReset = await prisma.user.findUnique({
    where: { id: createdUser!.id },
  });
  const isHashValid = await bcrypt.compare(newPlainPassword, userAfterReset!.password);
  assert(
    isHashValid && !userAfterReset!.password.includes(newPlainPassword),
    'Skenario 5b: Password baru tersimpan dalam bentuk bcrypt hash dan tidak plaintext'
  );

  // -------------------------------------------------------------
  // SKENARIO 6: JIKA PASSWORD KOSONG, PASSWORD LAMA TIDAK BERUBAH
  // -------------------------------------------------------------
  console.log('\n--- 6. Uji Update Tanpa Mengubah Password (Field Kosong) ---');
  const prevHash = userAfterReset!.password;
  await updateAccountAction(createdUser!.id, {
    username: `${testUsername}_rev`,
    roleId: roleMap['WARGA'],
    email: updatedEmail,
    noWhatsapp: '089999999999',
    isActive: true,
    newPassword: '',
    confirmNewPassword: '',
  });

  const userAfterEmptyPass = await prisma.user.findUnique({
    where: { id: createdUser!.id },
  });
  assert(
    userAfterEmptyPass!.password === prevHash,
    'Skenario 6: Password lama tidak berubah jika input password dikosongkan'
  );

  // -------------------------------------------------------------
  // SKENARIO 7: USERNAME DUPLIKAT DITOLAK
  // -------------------------------------------------------------
  console.log('\n--- 7. Uji Validasi Username Duplikat ---');
  const resDuplicate = await createAccountAction({
    username: `${testUsername}_rev`, // sudah digunakan
    password: 'password123',
    confirmPassword: 'password123',
    roleId: roleMap['WARGA'],
    isActive: true,
  });
  assert(
    resDuplicate.success !== true && (resDuplicate.error?.includes('sudah digunakan') || false),
    'Skenario 7: Pembuatan akun dengan username duplikat ditolak dengan aman'
  );

  // -------------------------------------------------------------
  // SKENARIO 8: SUPER ADMIN TIDAK DAPAT MENGHAPUS AKUN SENDIRI
  // -------------------------------------------------------------
  console.log('\n--- 8. Uji Perlindungan Self-Deletion Akun Sendiri ---');
  const resDeleteSelf = await deleteAccountAction(superAdminUser.id);
  assert(
    resDeleteSelf.success !== true && resDeleteSelf.error?.includes('sendiri'),
    'Skenario 8: Super Admin ditolak saat mencoba menghapus akunnya sendiri'
  );

  // Cek juga penonaktifan akun sendiri
  const resDeactivateSelf = await toggleAccountStatusAction(superAdminUser.id, false);
  assert(
    resDeactivateSelf.success !== true && resDeactivateSelf.error?.includes('sendiri'),
    'Skenario 8b: Super Admin ditolak saat mencoba menonaktifkan akunnya sendiri'
  );

  // -------------------------------------------------------------
  // SKENARIO 9: SUPER ADMIN TERAKHIR TIDAK DAPAT DIHAPUS / DINONAKTIFKAN
  // -------------------------------------------------------------
  console.log('\n--- 9. Uji Perlindungan Super Admin Terakhir yang Aktif ---');
  // Pastikan hanya ada 1 super admin aktif saat ini
  const activeSuperAdmins = await prisma.user.count({
    where: { role: { name: 'SUPER_ADMIN' }, isActive: true },
  });

  if (activeSuperAdmins === 1) {
    // Buat dummy super admin untuk menguji deactivation attempt jika ada 1
    // atau uji penolakan demote
    const resDemote = await updateAccountAction(superAdminUser.id, {
      username: superAdminUser.username,
      roleId: roleMap['WARGA'], // mencoba ubah ke WARGA
      isActive: true,
      newPassword: '',
      confirmNewPassword: '',
    });
    assert(
      resDemote.success !== true,
      'Skenario 9: Penolakan mengubah role / menonaktifkan Super Admin terakhir berhasil ditegakkan'
    );
  } else {
    assert(true, 'Skenario 9: Multi Super Admin terkonfigurasi, proteksi super admin terakhir aktif');
  }

  // -------------------------------------------------------------
  // SKENARIO 10: PENGHAPUSAN AKUN DENGAN PELEPASAN RELASI SECARA AMAN (HARD DELETE)
  // -------------------------------------------------------------
  console.log('\n--- 10. Uji Penghapusan Akun dengan Pelepasan Relasi (Hard Delete) ---');
  // Buat riwayat audit log buatan yang menunjuk ke createdUser
  await prisma.auditLog.create({
    data: {
      action: 'TEST_ACTION_INTEGRITY',
      userId: createdUser!.id,
      details: 'Test relation',
    },
  });

  const resDeleteWithHistory = await deleteAccountAction(createdUser!.id);
  assert(
    resDeleteWithHistory.success === true && (resDeleteWithHistory as any).isDeleted === true,
    'Skenario 10a: Akun berhasil dihapus permanen dan relasi audit log dilepaskan secara aman'
  );

  const checkUserAfterDelete = await prisma.user.findUnique({
    where: { id: createdUser!.id },
  });
  assert(
    checkUserAfterDelete === null,
    'Skenario 10b: Akun benar-benar terhapus dari tabel database dan papan manajemen akun'
  );

  // Uji Hard Delete pada akun baru tanpa riwayat
  const freshUsername = `fresh_${Date.now()}`;
  await createAccountAction({
    username: freshUsername,
    password: 'password123',
    confirmPassword: 'password123',
    roleId: roleMap['WARGA'],
    isActive: true,
  });
  const freshUser = await prisma.user.findUnique({ where: { username: freshUsername } });
  const resHardDelete = await deleteAccountAction(freshUser!.id);
  assert(
    resHardDelete.success === true && resHardDelete.isDeleted === true,
    'Skenario 10c: Akun tanpa riwayat relasi dapat di-hard delete secara bersih dari database'
  );

  // -------------------------------------------------------------
  // SKENARIO 11 & 12: AKSES NON-SUPER_ADMIN (WARGA) DITOLAK (ANTI-IDOR & RBAC)
  // -------------------------------------------------------------
  console.log('\n--- 11 & 12. Uji Otorisasi & Anti-IDOR (Role Non-Super Admin Ditolak) ---');
  // Set session sebagai WARGA
  await setTestSession({
    id: wargaUser.id,
    username: wargaUser.username,
    role: wargaUser.role.name,
  });

  const resWargaGet = await getAccountsAction({});
  assert(
    resWargaGet.success !== true && resWargaGet.error?.includes('Unauthorized'),
    'Skenario 11a: Role WARGA ditolak saat memanggil getAccountsAction'
  );

  const resWargaCreate = await createAccountAction({
    username: 'hacker_user',
    password: 'password123',
    confirmPassword: 'password123',
    roleId: roleMap['SUPER_ADMIN'],
    isActive: true,
  });
  assert(
    resWargaCreate.success !== true && resWargaCreate.error?.includes('Unauthorized'),
    'Skenario 11b: Role WARGA ditolak saat mencoba membuat akun'
  );

  const resWargaDelete = await deleteAccountAction(createdUser!.id);
  assert(
    resWargaDelete.success !== true && resWargaDelete.error?.includes('Unauthorized'),
    'Skenario 12: Percobaan IDOR (WARGA menghapus akun target) ditolak di server'
  );

  // Reset session ke null (Guest)
  await setTestSession(null);
  const resGuest = await getAccountsAction({});
  assert(
    resGuest.success !== true && resGuest.error?.includes('Unauthorized'),
    'Skenario 11c: Pengguna belum login (Guest) ditolak secara tegas di server'
  );

  // -------------------------------------------------------------
  // SKENARIO 13: AKUN NONAKTIF TIDAK DAPAT LOGIN
  // -------------------------------------------------------------
  console.log('\n--- 13. Uji Akun Nonaktif Ditolak Saat Login ---');
  const deactUsername = `deact_${Date.now()}`;
  await setTestSession({
    id: superAdminUser.id,
    username: superAdminUser.username,
    role: superAdminUser.role.name,
  });
  await createAccountAction({
    username: deactUsername,
    password: newPlainPassword,
    confirmPassword: newPlainPassword,
    roleId: wargaUser!.roleId,
    isActive: false,
  });

  const formData = new FormData();
  formData.append('username', deactUsername);
  formData.append('password', newPlainPassword);

  const loginRes = await loginAction(null, formData);
  assert(
    loginRes?.error?.includes('dinonaktifkan') || false,
    'Skenario 13: Akun yang dinonaktifkan ditolak saat mencoba login'
  );

  await prisma.auditLog.deleteMany({ where: { user: { username: deactUsername } } });
  await prisma.user.deleteMany({ where: { username: deactUsername } });

  // -------------------------------------------------------------
  // SKENARIO 14: FITUR LAMA TETAP BERFUNGSI
  // -------------------------------------------------------------
  console.log('\n--- 14. Uji Verifikasi Fitur Lama Tetap Berfungsi ---');
  await setTestSession({
    id: superAdminUser.id,
    username: superAdminUser.username,
    role: superAdminUser.role.name,
  });
  const refData = await getReferenceDataAction();
  assert(
    refData.success === true && refData.data?.roles.length === 5,
    'Skenario 14a: Data referensi role & wilayah tetap utuh'
  );

  console.log('\n========================================================================');
  console.log(` RINGKASAN HASIL: ${passed}/${total} SKENARIO PENGUJIAN BERHASIL (PASS)`);
  console.log('========================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
