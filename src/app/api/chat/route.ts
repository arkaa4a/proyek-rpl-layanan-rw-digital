import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { streamText, tool, isStepCount } from 'ai';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { AI_SYSTEM_PROMPT, RW_KNOWLEDGE_BASE, formatLingkunganInfo, formatPengumumanInfo, getAiSystemPrompt } from '@/lib/ai/knowledge';
import { getDecryptedSystemConfig } from '@/lib/config/systemConfigService';
import { z } from 'zod';

export const maxDuration = 60;

// In-memory rate limiting map (IP -> { count, resetAt })
// Keterbatasan: Ini adalah penyimpanan stateful per-instance dalam lingkungan serverless.
// Jika di-deploy ke AWS Lambda atau Vercel, state akan hilang saat cold start dan
// tidak dibagikan antar instance. Ini hanya berfungsi untuk menahan burst sederhana.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 menit
const MAX_REQUESTS_PER_WINDOW = 60; // Ditingkatkan agar pengujian dan percakapan lancar

export async function POST(req: Request) {
  try {
    // 1. Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
    const now = Date.now();
    const limitRecord = rateLimitMap.get(ip);
    
    if (limitRecord) {
      if (now > limitRecord.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      } else {
        limitRecord.count++;
        if (limitRecord.count > MAX_REQUESTS_PER_WINDOW) {
          return new Response(JSON.stringify({ error: 'Terlalu banyak permintaan. Silakan tunggu sebentar.' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    // 2. Limit ukuran payload
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 1024 * 500) { // 500KB max
      return new Response(JSON.stringify({ error: 'Ukuran payload terlalu besar.' }), { 
        status: 413, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const session = await getSession();
    const systemConfig = await getDecryptedSystemConfig();

    // Validasi status aktif/nonaktif chatbot
    if (systemConfig.chatbotEnabled === false) {
      return new Response(
        JSON.stringify({
          error:
            'Layanan Asisten AI RW saat ini sedang dinonaktifkan sementara oleh Administrator. Silakan hubungi pengurus RW secara langsung atau gunakan menu layanan administrasi yang tersedia.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validasi ketersediaan API Key (Utama & Cadangan)
    const primaryKey =
      systemConfig.geminiApiKeyDecrypted ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      '';

    const backupKey1 = systemConfig.apiKeyBackup1Decrypted || '';
    const backupKey2 = systemConfig.apiKeyBackup2Decrypted || '';

    const apiKeys = [primaryKey, backupKey1, backupKey2].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Layanan Asisten AI belum dikonfigurasi dengan API Key yang valid. Silakan hubungi Administrator sistem.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    require('fs').writeFileSync('ai-request.log', JSON.stringify(body, null, 2));

    // 3. Validasi dengan Zod
    const messageSchema = z.object({
      role: z.string(),
      content: z.string().optional().default(''),
      text: z.string().optional(),
    }).passthrough();

    const bodySchema = z.object({
      messages: z.array(messageSchema).min(1, "Minimal 1 pesan"),
    });

    const parseResult = bodySchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Format permintaan tidak valid.', details: parseResult.error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Optimalkan context window (15 pesan terakhir) agar proses prompt processing di Google AI sangat cepat
    const validMessages = parseResult.data.messages.slice(-15);

    const maxChars = 5000;
    // Validasi panjang karakter HANYA untuk pesan input pengguna terbaru
    const lastUserMessage = validMessages.filter(m => m.role === 'user').slice(-1)[0];
    if (lastUserMessage) {
      const userText = lastUserMessage.content || lastUserMessage.text || '';
      if (userText.length > maxChars) {
        return new Response(JSON.stringify({ error: `Teks pesan melebihi batas maksimal (${maxChars} karakter).` }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    // Ensure messages are converted to CoreMessage format properly
    const coreMessages = validMessages.map((m: any) => {
      let textContent = m.content || '';
      if (!textContent && m.parts && Array.isArray(m.parts)) {
        textContent = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n');
      }
      // Fallback for custom objects like { text: "..." }
      if (!textContent && m.text) {
        textContent = m.text;
      }
      return {
        role: m.role || 'user',
        content: textContent
      };
    }).filter(m => m.content.trim() !== ''); // Remove completely empty messages

    if (coreMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'Pesan tidak boleh kosong.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let rwScopeId: string | null = session?.rwId || null;
    
    // 1. Fallback untuk Ketua RT (jika session.rtId tersedia)
    if (session && !rwScopeId && session.rtId) {
      try {
        const rt = await prisma.rt.findUnique({
          where: { id: session.rtId },
          select: { rwId: true }
        });
        if (rt?.rwId) {
          rwScopeId = rt.rwId;
        }
      } catch (error) {
        console.error("Failed to fetch RT for RW scope:", error);
      }
    }

    // 2. Fallback untuk Warga (jika session.wargaId tersedia)
    if (session && !rwScopeId && session.wargaId) {
      try {
        const warga = await prisma.warga.findUnique({
          where: { id: session.wargaId },
          include: { rt: true }
        });
        if (warga?.rt?.rwId) {
          rwScopeId = warga.rt.rwId;
        }
      } catch (error) {
        console.error("Failed to fetch Warga for RW scope:", error);
      }
    }

    // 3. Fallback jika tanpa rwScopeId dan database memiliki tepat satu RW
    if (!rwScopeId) {
      try {
        const rws = await prisma.rw.findMany({
          take: 2,
          select: { id: true }
        });
        if (rws.length === 1) {
          rwScopeId = rws[0].id;
        }
      } catch (error) {
        console.error("Failed to fetch single RW for scope:", error);
      }
    }

    let dynamicKnowledge = '';
    let pengumumanKnowledge = '';

    if (rwScopeId) {
      try {
        const [infos, pengumumanList] = await Promise.all([
          prisma.lingkunganInfo.findMany({
            where: {
              isPublished: true,
              rwId: rwScopeId
            },
            select: {
              kategori: true,
              judul: true,
              konten: true,
            },
            orderBy: {
              kategori: 'asc',
            },
            take: 20
          }),
          prisma.pengumuman.findMany({
            where: {
              rwId: rwScopeId
            },
            select: {
              judul: true,
              konten: true,
              kategori: true,
              prioritas: true,
              tanggalKegiatan: true,
              lokasiKegiatan: true,
            },
            orderBy: [
              { prioritas: 'desc' },
              { createdAt: 'desc' }
            ],
            take: 10
          })
        ]);
        
        if (infos.length > 0) {
          dynamicKnowledge = formatLingkunganInfo(infos);
        }

        if (pengumumanList.length > 0) {
          pengumumanKnowledge = formatPengumumanInfo(pengumumanList);
        }
      } catch (error) {
        console.error("Failed to fetch dynamic knowledge or announcements:", error);
      }
    }

    const combinedKnowledge = [
      RW_KNOWLEDGE_BASE,
      dynamicKnowledge,
      pengumumanKnowledge
    ].filter(Boolean).join('\n\n---\n\n');

    // 3.5. Ambil data identitas pengguna yang terverifikasi di server (hanya untuk pengguna sesi saat ini)
    let verifiedIdentity = {
      isAuthenticated: false,
      name: null as string | null,
      username: null as string | null,
      role: null as string | null,
      isActive: true,
      rtNomor: null as string | null,
      rwNomor: null as string | null,
      namaKetuaRt: null as string | null,
      namaKetuaRw: null as string | null,
      alamat: null as string | null,
      nomorKk: null as string | null,
      pekerjaan: null as string | null,
      agama: null as string | null,
      wargaId: null as string | null,
    };

    if (session?.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.id },
          select: {
            username: true,
            isActive: true,
            role: { select: { name: true } },
            warga: {
              select: {
                id: true,
                namaLengkap: true,
                agama: true,
                pekerjaan: true,
                keluarga: {
                  select: {
                    nomorKk: true,
                    alamat: true,
                  },
                },
                rt: {
                  select: {
                    nomor: true,
                    namaKetua: true,
                    rw: {
                      select: {
                        nomor: true,
                        namaKetua: true,
                      },
                    },
                  },
                },
              },
            },
            rt: { select: { nomor: true, namaKetua: true, rw: { select: { nomor: true, namaKetua: true } } } },
            rw: { select: { nomor: true, namaKetua: true } },
          },
        });

        if (user) {
          const userRt = user.warga?.rt || user.rt;
          const userRw = user.warga?.rt?.rw || user.rt?.rw || user.rw;
          verifiedIdentity = {
            isAuthenticated: true,
            name: user.warga?.namaLengkap || user.username || null,
            username: user.username,
            role: user.role?.name || session.role || 'WARGA',
            isActive: user.isActive,
            rtNomor: userRt?.nomor || null,
            rwNomor: userRw?.nomor || null,
            namaKetuaRt: userRt?.namaKetua || null,
            namaKetuaRw: userRw?.namaKetua || null,
            alamat: user.warga?.keluarga?.alamat || null,
            nomorKk: user.warga?.keluarga?.nomorKk || null,
            pekerjaan: user.warga?.pekerjaan || null,
            agama: user.warga?.agama || null,
            wargaId: user.warga?.id || null,
          };
        }
      } catch (error) {
        console.error("Failed to fetch verified user identity:", error);
      }
    }

    const userRole = session?.role || 'GUEST';
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isRwLeader = userRole === 'ADMIN_RW' || userRole === 'KETUA_RW';
    const isRtLeader = userRole === 'KETUA_RT';
    const isWarga = userRole === 'WARGA';

    const effectiveRtId = session?.rtId || (verifiedIdentity.rtNomor ? (await prisma.rt.findFirst({ where: { nomor: verifiedIdentity.rtNomor, rwId: rwScopeId || undefined }, select: { id: true } }))?.id : null) || null;
    const effectiveRwId = session?.rwId || rwScopeId || null;

    // Hitung statistik real-time database untuk disinkronkan langsung ke system prompt admin & pengurus
    let liveStatsSection = '';
    if (isRtLeader && effectiveRtId) {
      try {
        const rtData = await prisma.rt.findUnique({
          where: { id: effectiveRtId },
          select: { nomor: true, rw: { select: { nomor: true } } },
        });
        const [
          rtWargaCount,
          rtRequestCount,
          rtMenungguRtCount,
          rtSelesaiCount,
          rtPengaduanCount,
          rtPengaduanPerluDitinjau,
          rtPengaduanDiproses,
          rtPengaduanSelesai,
        ] = await Promise.all([
          prisma.warga.count({ where: { rtId: effectiveRtId, isActive: true } }),
          prisma.request.count({ where: { applicant: { rtId: effectiveRtId } } }),
          prisma.request.count({ where: { applicant: { rtId: effectiveRtId }, status: { in: ['SUBMITTED', 'REVISION_REQUIRED'] } } }),
          prisma.request.count({ where: { applicant: { rtId: effectiveRtId }, status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
          prisma.pengaduan.count({ where: { rtId: effectiveRtId } }),
          prisma.pengaduan.count({ where: { rtId: effectiveRtId, status: { in: ['DILAPORKAN', 'DITINJAU'] } } }),
          prisma.pengaduan.count({ where: { rtId: effectiveRtId, status: 'DIPROSES' } }),
          prisma.pengaduan.count({ where: { rtId: effectiveRtId, status: 'SELESAI' } }),
        ]);

        liveStatsSection = `
DATA RESMI KARTU DASHBOARD KETUA RT ${rtData?.nomor || '-'} (REAL-TIME DATABASE WILAYAH RT ANDA):
- Total Warga Aktif RT ${rtData?.nomor || '-'}: ${rtWargaCount} warga (KARTU 'Total Warga Aktif' DI DASHBOARD KETUA RT)
- Menunggu Verifikasi RT: ${rtMenungguRtCount} pengajuan (KARTU 'Menunggu Verifikasi' DI DASHBOARD KETUA RT)
- Pengajuan Selesai: ${rtSelesaiCount} pengajuan (KARTU 'Pengajuan Selesai' DI DASHBOARD KETUA RT)
- Total Pengajuan Warga RT: ${rtRequestCount} pengajuan
- Total Pengaduan Warga di RT: ${rtPengaduanCount} pengaduan (${rtPengaduanPerluDitinjau} perlu ditinjau, ${rtPengaduanDiproses} sedang diproses, ${rtPengaduanSelesai} selesai)

ATURAN WAJIB KETUA RT:
1. Jika pengguna menanyakan "berapa jumlah warga di RT saya", "ada berapa warga di RT saya", "total warga RT":
   WAJIB JAWAB HANYA JUMLAH WARGA DI RT ${rtData?.nomor || '-'}:
   "Jumlah warga aktif di RT ${rtData?.nomor || '-'} yang tercatat saat ini adalah **${rtWargaCount} warga**."
   DILARANG KERAS menjawab jumlah warga global seluruh RW atau RT lain!
2. Jika pengguna menanyakan "berapa pengajuan surat di RT saya" atau "menunggu verifikasi":
   Jawab sesuai data pengajuan RT Anda: **${rtRequestCount} total pengajuan** (${rtMenungguRtCount} menunggu verifikasi RT, ${rtSelesaiCount} selesai).
3. Jika pengguna menanyakan pengaduan di RT:
   Jawab terdapat **${rtPengaduanCount} pengaduan** di lingkungan RT ${rtData?.nomor || '-'} (${rtPengaduanPerluDitinjau} perlu ditinjau, ${rtPengaduanDiproses} sedang diproses, ${rtPengaduanSelesai} selesai). Jangan gabungkan perlu ditinjau dengan sedang diproses!
4. Anda HANYA berwenang untuk warga di lingkungan RT ${rtData?.nomor || '-'}.
`;
      } catch (err) {
        console.error('Failed to query RT stats for AI system prompt:', err);
      }
    } else if (isRwLeader && effectiveRwId) {
      try {
        const [
          rwWargaCount,
          rwRtCount,
          rwRequestCount,
          rwMenungguApprovalCount,
          rwSelesaiCount,
          rwPengaduanCount,
          rwPengaduanPerluDitinjau,
          rwPengaduanDiproses,
          rwPengaduanSelesai,
        ] = await Promise.all([
          prisma.warga.count({ where: { isActive: true, rt: { rwId: effectiveRwId } } }),
          prisma.rt.count({ where: { rwId: effectiveRwId } }),
          prisma.request.count({ where: { applicant: { rt: { rwId: effectiveRwId } } } }),
          prisma.request.count({ where: { applicant: { rt: { rwId: effectiveRwId } }, status: 'VERIFIED_RT' } }),
          prisma.request.count({ where: { applicant: { rt: { rwId: effectiveRwId } }, status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
          prisma.pengaduan.count({ where: { rwId: effectiveRwId } }),
          prisma.pengaduan.count({ where: { rwId: effectiveRwId, status: { in: ['DILAPORKAN', 'DITINJAU'] } } }),
          prisma.pengaduan.count({ where: { rwId: effectiveRwId, status: 'DIPROSES' } }),
          prisma.pengaduan.count({ where: { rwId: effectiveRwId, status: 'SELESAI' } }),
        ]);

        liveStatsSection = `
DATA RESMI KARTU DASHBOARD KETUA/ADMIN RW (REAL-TIME DATABASE WILAYAH RW ANDA):
- Total Warga RW: ${rwWargaCount} warga (KARTU 'Total Warga RW' DI DASHBOARD KETUA/ADMIN RW)
- Total RT di RW: ${rwRtCount} RT (KARTU 'Total RT' DI DASHBOARD KETUA/ADMIN RW)
- Pengajuan Masuk: ${rwRequestCount} pengajuan (KARTU 'Pengajuan Masuk' DI DASHBOARD)
- Menunggu Approval RW: ${rwMenungguApprovalCount} pengajuan (KARTU 'Menunggu Approval' DI DASHBOARD)
- Pengajuan Selesai: ${rwSelesaiCount} pengajuan
- Total Pengaduan Warga RW: ${rwPengaduanCount} pengaduan (${rwPengaduanPerluDitinjau} perlu ditinjau, ${rwPengaduanDiproses} sedang diproses, ${rwPengaduanSelesai} selesai)

ATURAN WAJIB KETUA/ADMIN RW:
1. Jika pengguna menanyakan "berapa jumlah warga di RW saya", "total warga RW":
   WAJIB JAWAB HANYA JUMLAH WARGA DI RW ANDA:
   "Jumlah warga di lingkungan RW yang tercatat saat ini adalah **${rwWargaCount} warga** yang tersebar di **${rwRtCount} RT**."
2. Jika pengguna menanyakan "berapa pengajuan surat yang sedang diproses di RW saya" atau "menunggu approval":
   "Saat ini terdapat **${rwMenungguApprovalCount} pengajuan** yang sedang menunggu persetujuan (approval) tingkat RW, dari total **${rwRequestCount} pengajuan** yang masuk."
3. Jika pengguna menanyakan "data pengaduan di wilayah saya":
   "Tercatat total **${rwPengaduanCount} pengaduan** warga di wilayah RW Anda (${rwPengaduanPerluDitinjau} perlu ditinjau, ${rwPengaduanDiproses} sedang diproses, ${rwPengaduanSelesai} selesai). Jangan gabungkan perlu ditinjau dengan sedang diproses!"
`;
      } catch (err) {
        console.error('Failed to query RW stats for AI system prompt:', err);
      }
    } else if (isSuperAdmin) {
      try {
        const [
          liveWargaCount,
          liveUserCount,
          liveRtCount,
          liveRwCount,
          liveRequestCount,
          liveSelesaiCount,
          liveAktifCount,
          livePengaduanCount,
          livePengaduanPerluDitinjau,
          livePengaduanDiproses,
          livePengaduanSelesai,
        ] = await Promise.all([
          prisma.warga.count({ where: { isActive: true } }),
          prisma.user.count(),
          prisma.rt.count(),
          prisma.rw.count(),
          prisma.request.count(),
          prisma.request.count({ where: { status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
          prisma.request.count({ where: { status: { notIn: ['DRAFT', 'APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'COMPLETED'] } } }),
          prisma.pengaduan.count(),
          prisma.pengaduan.count({ where: { status: { in: ['DILAPORKAN', 'DITINJAU'] } } }),
          prisma.pengaduan.count({ where: { status: 'DIPROSES' } }),
          prisma.pengaduan.count({ where: { status: 'SELESAI' } }),
        ]);

        liveStatsSection = `
DATA RESMI KARTU DASHBOARD SAAT INI (REAL-TIME DATABASE):
- Total Warga: ${liveWargaCount} warga (KARTU 'Total Warga' DI DASHBOARD)
- Total RT: ${liveRtCount} RT | Total RW: ${liveRwCount} RW
- Total Pengajuan: ${liveRequestCount} pengajuan (KARTU 'Total Pengajuan' DI DASHBOARD)
- Pengajuan Selesai: ${liveSelesaiCount} pengajuan (KARTU 'Pengajuan Selesai' DI DASHBOARD)
- Pengajuan Aktif / Sedang Diproses: ${liveAktifCount} pengajuan
- Total Pengaduan: ${livePengaduanCount} pengaduan (KARTU 'Total Pengaduan' DI DASHBOARD)
- Pengaduan Perlu Ditinjau: ${livePengaduanPerluDitinjau} pengaduan (KARTU 'Perlu Ditinjau / Dilaporkan' DI DASHBOARD)
- Pengaduan Sedang Diproses: ${livePengaduanDiproses} pengaduan (KARTU 'Sedang Diproses' DI DASHBOARD)
- Pengaduan Selesai: ${livePengaduanSelesai} pengaduan (KARTU 'Pengaduan Selesai' DI DASHBOARD)
- Total Akun Pengguna: ${liveUserCount} akun

ATURAN WAJIB: FOKUS HANYA PADA APA YANG DITANYAKAN (STRICT TO THE POINT):
- Jawablah secara langsung dan to-the-point tanpa menambahkan rincian tambahan, bullet points status, atau breakdown data lain yang TIDAK diminta oleh pengguna!
1. Jika pengguna menanyakan "ada berapa total pengajuan", "berapa total pengajuan", "total pengajuan":
   WAJIB JAWAB HANYA ANGKA TOTAL PENGAJUAN:
   "Total pengajuan surat yang tercatat di dalam sistem adalah **${liveRequestCount} pengajuan**."
   DILARANG KERAS menambahkan rincian selesai atau aktif jika pengguna HANYA bertanya total pengajuan!
2. Jika pengguna menanyakan "berapa total warga", "total warga", "jumlah warga":
   WAJIB JAWAB HANYA ANGKA TOTAL WARGA:
   "Total warga yang terdaftar saat ini adalah **${liveWargaCount} warga**."
   DILARANG KERAS merinci nama warga atau per RT jika pengguna HANYA menanyakan total warga!
3. Jika pengguna menanyakan "berapa pengajuan yang selesai", "pengajuan selesai":
   WAJIB JAWAB HANYA ANGKA PENGAJUAN SELESAI:
   "Pengajuan surat yang telah selesai berjumlah **${liveSelesaiCount} pengajuan**."
   DILARANG KERAS menyertakan pengajuan aktif atau total jika tidak ditanyakan!
4. Jika pengguna menanyakan "berapa total akun", "ada berapa user":
   WAJIB JAWAB HANYA ANGKA TOTAL AKUN:
   "Total akun pengguna yang terdaftar di sistem adalah **${liveUserCount} akun**."
   DILARANG KERAS mendaftar semua username/role jika tidak diminta!
5. STATISTIK PENGADUAN WARGA (4 KARTU RESMI DI DASHBOARD):
   - Jika ditanya "total pengaduan", "berapa total pengaduan":
     Jawab HANYA angka total pengaduan: "Total pengaduan warga yang tercatat adalah **${livePengaduanCount} pengaduan**."
   - Jika ditanya "pengaduan perlu ditinjau", "pengaduan dilaporkan", "belum ditinjau":
     Jawab: "Pengaduan yang perlu ditinjau / dilaporkan berjumlah **${livePengaduanPerluDitinjau} pengaduan**."
   - Jika ditanya "pengaduan sedang diproses", "pengaduan diproses":
     Jawab: "Pengaduan yang sedang diproses berjumlah **${livePengaduanDiproses} pengaduan**."
   - Jika ditanya "pengaduan selesai", "berapa pengaduan yang selesai":
     Jawab: "Pengaduan yang telah selesai berjumlah **${livePengaduanSelesai} pengaduan**."
   - DILARANG KERAS mencampur angka 'Perlu Ditinjau' (${livePengaduanPerluDitinjau}) ke dalam status 'Sedang Diproses' (${livePengaduanDiproses})!
6. Rincian atau breakdown HANYA boleh ditampilkan jika pengguna secara eksplisit menggunakan kata "rincian", "detail", "daftar", "sebutkan siapa saja", atau "rekapitulasi lengkap"!
`;
      } catch (err) {
        console.error('Failed to query live stats for AI system prompt:', err);
      }
    }

    // Gunakan prompt khusus sesuai role sesi pengguna yang tervalidasi di server beserta identitas terverifikasi
    const baseSystemPrompt = getAiSystemPrompt(
      session?.role,
      combinedKnowledge,
      verifiedIdentity,
      systemConfig.aiSystemInstruction,
      systemConfig.aiFallbackMessage,
      systemConfig.aiOutOfScopeMessage,
      liveStatsSection
    );

    const systemPrompt = `${baseSystemPrompt}

========================================================================
INSTRUKSI PENGGUNAAN TOOL PENGUMUMAN & KEGIATAN:
========================================================================
Jika pengguna menanyakan tentang pengumuman, jadwal, rapat, atau kegiatan RW, KAMU WAJIB memanggil tool 'cekPengumumanRW' untuk mengecek data riil dari database. Jangan pernah menjawab tidak ada pengumuman tanpa memanggil tool ini terlebih dahulu.
`;

    // Siapkan tools: Hanya role pengurus/admin yang mendapat akses tool admin
    const isPrivilegedAdminRole = Boolean(isSuperAdmin || isRwLeader || isRtLeader);

    const aiTools: Record<string, any> = {};

    // 0. Shared Tools: Tersedia untuk seluruh role (Warga, Pengurus, dan Super Admin)
    aiTools.get_layanan_tersedia = tool({
      description: 'Mengambil daftar jenis layanan surat administrasi yang tersedia di sistem RW beserta syarat dokumennya dari database.',
      parameters: z.object({
        namaLayanan: z.string().optional().describe('Nama layanan spesifik yang dicari (misal: domisili, sku, sktm), atau kosongkan untuk melihat semua layanan aktif'),
      }),
      execute: (async ({ namaLayanan }: { namaLayanan?: string }) => {
        try {
          const q = namaLayanan?.trim();
          const services = await prisma.serviceType.findMany({
            where: {
              isActive: true,
              ...(q ? { name: { contains: q } } : {}),
            },
            orderBy: { name: 'asc' },
          });

          if (services.length === 0) {
            return { message: 'Tidak ditemukan layanan yang sesuai di database.' };
          }

          return services.map(s => {
            let reqs: string[] = [];
            try {
              reqs = s.requirements ? JSON.parse(s.requirements) : [];
            } catch {
              reqs = s.requirements ? [s.requirements] : [];
            }
            return {
              id: s.id,
              nama: s.name,
              deskripsi: s.description || '-',
              persyaratan: reqs.length > 0 ? reqs : ['KTP', 'KK', 'Surat Pengantar RT'],
            };
          });
        } catch (err) {
          return { error: 'Gagal mengambil data layanan dari database.' };
        }
      }) as any,
    } as any);

    aiTools.get_pengumuman_rw = tool({
      description: 'Mengambil daftar pengumuman resmi dan agenda kegiatan RW terbaru dari database.',
      parameters: z.object({
        kategori: z.string().optional().describe('Kategori pengumuman atau kosongkan untuk melihat pengumuman terbaru'),
      }),
      execute: (async ({ kategori }: { kategori?: string }) => {
        try {
          const q = kategori?.trim();
          const notices = await prisma.pengumuman.findMany({
            where: {
              ...(rwScopeId ? { rwId: rwScopeId } : {}),
              ...(q ? { kategori: { contains: q } } : {}),
            },
            orderBy: [{ prioritas: 'desc' }, { createdAt: 'desc' }],
            take: 10,
          });

          if (notices.length === 0) {
            return { message: 'Belum ada pengumuman terbaru di database.' };
          }

          return notices.map(n => ({
            judul: n.judul,
            kategori: n.kategori,
            prioritas: n.prioritas ? 'PENTING / PRIORITAS' : 'Biasa',
            konten: n.konten,
            tanggalKegiatan: n.tanggalKegiatan || '-',
            lokasiKegiatan: n.lokasiKegiatan || '-',
            tanggalDibuat: n.createdAt,
          }));
        } catch (err) {
          return { error: 'Gagal mengambil pengumuman dari database.' };
        }
      }) as any,
    } as any);

    aiTools.cekPengumumanRW = tool({
      description: 'Membaca data pengumuman dan agenda kegiatan RW terbaru secara real-time dari database.',
      parameters: z.object({
        limit: z.number().optional().describe('Jumlah maksimal pengumuman yang ingin diambil (default: 5)'),
      }),
      execute: (async ({ limit }: { limit?: number } = {}) => {
        try {
          const pengumuman = await prisma.pengumuman.findMany({
            // Hapus blok 'where' sementara untuk debugging
            orderBy: { createdAt: 'desc' },
            take: limit || 5,
          });

          // Tambahkan log ini untuk melihat di terminal VS Code
          console.log("[DEBUG PENGUMUMAN] Hasil ditarik dari DB:", pengumuman);

          if (!pengumuman || pengumuman.length === 0) {
            return 'Tidak ada pengumuman saat ini.';
          }

          return JSON.stringify(pengumuman);
        } catch (err) {
          console.error("[DEBUG PENGUMUMAN] Error query:", err);
          return 'Gagal mengambil data pengumuman dari database.';
        }
      }) as any,
    } as any);

    aiTools.get_info_lingkungan = tool({
      description: 'Mengambil informasi operasional lingkungan RW (jadwal sampah, jadwal ronda malam, posko, fasilitas umum) dari database.',
      parameters: z.object({
        kategori: z.string().optional().describe('Kategori info lingkungan (misal: JADWAL, KEAMANAN, KEBERSIHAN) atau kata kunci pencarian'),
      }),
      execute: (async ({ kategori }: { kategori?: string }) => {
        try {
          const q = kategori?.trim();
          const infos = await prisma.lingkunganInfo.findMany({
            where: {
              isPublished: true,
              ...(rwScopeId ? { rwId: rwScopeId } : {}),
              ...(q ? {
                OR: [
                  { kategori: { contains: q } },
                  { judul: { contains: q } },
                  { konten: { contains: q } },
                ]
              } : {}),
            },
            take: 10,
            orderBy: { kategori: 'asc' },
          });

          if (infos.length === 0) {
            return { message: 'Informasi lingkungan belum tersedia di database.' };
          }

          return infos.map(i => ({
            kategori: i.kategori,
            judul: i.judul,
            konten: i.konten,
          }));
        } catch (err) {
          return { error: 'Gagal mengambil informasi lingkungan dari database.' };
        }
      }) as any,
    } as any);

    aiTools.get_informasi_wilayah_rt_rw = tool({
      description: 'Mengambil informasi struktur wilayah RT dan RW (nomor RT, nama ketua RT, nomor RW, nama ketua RW, kelurahan, kecamatan, daftar RT) dari database.',
      parameters: z.object({
        nomorRt: z.string().optional().describe('Nomor RT tertentu yang dicari, atau kosongkan untuk melihat wilayah RW dan RT'),
      }),
      execute: (async ({ nomorRt }: { nomorRt?: string }) => {
        try {
          const targetRwId = rwScopeId;
          if (!targetRwId) {
            return { message: 'Informasi RW tidak ditemukan dalam sesi.' };
          }

          const rw = await prisma.rw.findUnique({
            where: { id: targetRwId },
            include: {
              rts: {
                where: nomorRt ? { nomor: nomorRt.trim() } : {},
                include: {
                  _count: { select: { warga: true } },
                },
                orderBy: { nomor: 'asc' },
              },
            },
          });

          if (!rw) {
            return { message: 'Data RW tidak ditemukan di database.' };
          }

          return {
            nomorRw: rw.nomor,
            namaKetuaRw: rw.namaKetua || 'Belum terdaftar',
            kelurahan: rw.kelurahan || '-',
            kecamatan: rw.kecamatan || '-',
            daftarRt: rw.rts.map(r => ({
              nomorRt: r.nomor,
              namaKetuaRt: r.namaKetua || 'Belum terdaftar',
              namaWilayah: r.namaWilayah || '-',
              ...(isWarga ? {} : { jumlahWarga: r._count?.warga ?? 0 }),
            })),
          };
        } catch (err) {
          return { error: 'Gagal mengambil informasi wilayah RT/RW dari database.' };
        }
      }) as any,
    } as any);

    if (isPrivilegedAdminRole) {
      // 1. Tool Pencarian Data Warga & Data Pribadi (Ter-scope sesuai kewenangan role)
      aiTools.cari_data_warga = tool({
        description: 'Mencari data warga di database berdasarkan nama, NIK, nomor KK, atau nomor RT. Mengembalikan data profil dan data pribadi lengkap warga (Nama, NIK, No. KK, Alamat, No. WA, RT/RW, Pekerjaan, status akun) serta total warga aktif di wilayah kewenangan Anda.',
        parameters: z.object({
          query: z.string().optional().describe('Nama lengkap warga, NIK, nomor KK, atau nomor RT yang dicari, atau kosongkan untuk melihat daftar seluruh warga di wilayah kewenangan Anda'),
        }),
        execute: (async ({ query }: { query?: string }) => {
          try {
            const q = query?.trim();
            let scopeFilter: any = {};
            if (isRtLeader && effectiveRtId) {
              scopeFilter = { rtId: effectiveRtId };
            } else if (isRwLeader && effectiveRwId) {
              scopeFilter = { rt: { rwId: effectiveRwId } };
            }

            const searchFilter: any = q
              ? {
                  OR: [
                    { namaLengkap: { contains: q } },
                    { nik: { contains: q } },
                    { keluarga: { nomorKk: { contains: q } } },
                    { rt: { nomor: { contains: q } } },
                  ],
                }
              : {};

            const whereCondition: any = {
              AND: [
                { isActive: true },
                scopeFilter,
                searchFilter,
              ],
            };

            const [totalWargaAktif, totalCocok, wargaList] = await Promise.all([
              prisma.warga.count({ where: { AND: [{ isActive: true }, scopeFilter] } }),
              prisma.warga.count({ where: whereCondition }),
              prisma.warga.findMany({
                where: whereCondition,
                include: {
                  keluarga: true,
                  rt: { include: { rw: true } },
                  user: { select: { username: true, role: { select: { name: true } }, isActive: true } },
                },
                take: 10,
                orderBy: { namaLengkap: 'asc' },
              }),
            ]);

            if (wargaList.length === 0) {
              return { 
                totalWargaAktifSistem: totalWargaAktif,
                message: q ? `Tidak ditemukan data warga dengan kata kunci "${q}" di database wilayah kewenangan Anda.` : 'Tidak ada data warga di database wilayah kewenangan Anda.' 
              };
            }

            return {
              totalWargaAktifSistem: totalWargaAktif,
              totalDitemukan: totalCocok,
              daftarWarga: wargaList.map((w) => ({
                id: w.id,
                namaLengkap: w.namaLengkap,
                nik: w.nik,
                nomorKk: w.keluarga?.nomorKk || '-',
                alamat: w.keluarga?.alamat || '-',
                pekerjaan: w.pekerjaan || '-',
                agama: w.agama || '-',
                noWhatsapp: w.noWhatsapp || '-',
                email: w.email || '-',
                wilayah: w.rt ? `RT ${w.rt.nomor} / RW ${w.rt.rw?.nomor || '-'}` : '-',
                statusAkun: w.user
                  ? `Terdaftar (Username: ${w.user.username}, Role: ${w.user.role.name}, Status: ${w.user.isActive ? 'Aktif' : 'Nonaktif'})`
                  : 'Belum memiliki akun',
              })),
            };
          } catch (err) {
            return { error: 'Gagal mengambil data warga dari database.' };
          }
        }) as any,
      } as any);

      // 2. Tool Pencarian Akun Pengguna
      aiTools.cari_data_akun = tool({
        description: 'Mencari dan menampilkan akun pengguna (User) di sistem database berdasarkan username, role, status aktif, atau email, beserta total jumlah akun terdaftar di database.',
        parameters: z.object({
          query: z.string().optional().describe('Username, role (SUPER_ADMIN, KETUA_RW, KETUA_RT, ADMIN_RW, WARGA), atau kosongkan untuk melihat seluruh akun pengguna'),
        }),
        execute: (async ({ query }: { query?: string }) => {
          try {
            let scopeFilter: any = {};
            if (isRtLeader && effectiveRtId) {
              scopeFilter = { warga: { rtId: effectiveRtId } };
            } else if (isRwLeader && effectiveRwId) {
              scopeFilter = {
                OR: [
                  { rwId: effectiveRwId },
                  { rt: { rwId: effectiveRwId } },
                  { warga: { rt: { rwId: effectiveRwId } } },
                ],
              };
            }

            const q = query?.trim();
            const searchFilter: any = q
              ? {
                  OR: [
                    { username: { contains: q } },
                    { email: { contains: q } },
                    { role: { name: { contains: q } } },
                    { warga: { namaLengkap: { contains: q } } },
                  ],
                }
              : {};

            const whereCondition: any = {
              AND: [
                scopeFilter,
                searchFilter,
              ],
            };

            const [totalAkun, totalCocok, userList] = await Promise.all([
              prisma.user.count({ where: scopeFilter }),
              prisma.user.count({ where: whereCondition }),
              prisma.user.findMany({
                where: whereCondition,
                include: {
                  role: true,
                  warga: true,
                  rt: true,
                  rw: true,
                },
                take: 25,
                orderBy: { createdAt: 'desc' },
              }),
            ]);

            if (userList.length === 0) {
              return { 
                totalAkunTerdaftar: totalAkun,
                message: 'Tidak ditemukan data akun yang cocok di database wilayah kewenangan Anda.' 
              };
            }

            return {
              totalAkunTerdaftar: totalAkun,
              totalDitemukan: totalCocok,
              daftarAkun: userList.map((u) => ({
                id: u.id,
                username: u.username,
                role: u.role.name,
                status: u.isActive ? 'Aktif' : 'Nonaktif',
                email: u.email || '-',
                noWhatsapp: u.noWhatsapp || '-',
                namaWargaTerkait: u.warga?.namaLengkap || '-',
                wilayah: u.rt ? `RT ${u.rt.nomor}` : u.rw ? `RW ${u.rw.nomor}` : 'Global (Super Admin)',
                tanggalDaftar: u.createdAt,
              })),
            };
          } catch (err) {
            return { error: 'Gagal mengambil data akun dari database.' };
          }
        }) as any,
      } as any);

      // 3. Tool Statistik Database
      aiTools.get_statistik_database = tool({
        description: 'Mengambil ringkasan statistik terkini database sistem yang sinkron persis dengan angka kartu dashboard: jumlah total warga, total RT/RW, statistik pengajuan surat (total pengajuan, pengajuan selesai, pengajuan aktif/diproses, pengajuan ditolak), statistik pengaduan warga, total keluarga, akun pengguna, dan pembagian warga per RT sesuai wilayah kewenangan akun Anda.',
        parameters: z.object({}),
        execute: (async () => {
          try {
            if (isRtLeader && effectiveRtId) {
              const rtInfo = await prisma.rt.findUnique({
                where: { id: effectiveRtId },
                include: {
                  rw: true,
                  warga: {
                    where: { isActive: true },
                    select: { namaLengkap: true, user: { select: { username: true } } },
                  },
                },
              });

              const [
                rtWargaCount,
                rtRequestCount,
                rtMenungguCount,
                rtSelesaiCount,
                rtDitolakCount,
                rtPengaduanCount,
              ] = await Promise.all([
                prisma.warga.count({ where: { rtId: effectiveRtId, isActive: true } }),
                prisma.request.count({ where: { applicant: { rtId: effectiveRtId } } }),
                prisma.request.count({ where: { applicant: { rtId: effectiveRtId }, status: { in: ['SUBMITTED', 'REVISION_REQUIRED'] } } }),
                prisma.request.count({ where: { applicant: { rtId: effectiveRtId }, status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
                prisma.request.count({ where: { applicant: { rtId: effectiveRtId }, status: 'REJECTED' } }),
                prisma.pengaduan.count({ where: { rtId: effectiveRtId } }),
              ]);

              return {
                wilayahKewenangan: `RT ${rtInfo?.nomor || '-'} / RW ${rtInfo?.rw?.nomor || '-'} (Kewenangan Anda)`,
                angkaStatistikDashboard: {
                  totalWargaAktif: rtWargaCount,
                  menungguVerifikasiRT: rtMenungguCount,
                  pengajuanSelesai: rtSelesaiCount,
                  pengajuanDitolak: rtDitolakCount,
                  totalPengajuanWargaRT: rtRequestCount,
                  totalPengaduanDiRt: rtPengaduanCount,
                },
                daftarWargaDiRt: rtInfo?.warga.map(w => ({
                  nama: w.namaLengkap,
                  username: w.user?.username || null,
                })) || [],
                catatanPenting: `PENTING: Jumlah warga aktif di RT ${rtInfo?.nomor || '-'} Anda adalah ${rtWargaCount} warga. Selalu jawab ${rtWargaCount} warga jika ditanya berapa jumlah warga di RT saya.`,
              };
            }

            if (isRwLeader && effectiveRwId) {
              const rwInfo = await prisma.rw.findUnique({
                where: { id: effectiveRwId },
                include: {
                  rts: {
                    include: {
                      _count: { select: { warga: true } },
                      warga: {
                        where: { isActive: true },
                        select: { namaLengkap: true, user: { select: { username: true } } },
                      },
                    },
                    orderBy: { nomor: 'asc' },
                  },
                },
              });

              const [
                rwWargaCount,
                rwRtCount,
                rwRequestCount,
                rwMenungguApprovalCount,
                rwSelesaiCount,
                rwDitolakCount,
                rwPengaduanCount,
              ] = await Promise.all([
                prisma.warga.count({ where: { isActive: true, rt: { rwId: effectiveRwId } } }),
                prisma.rt.count({ where: { rwId: effectiveRwId } }),
                prisma.request.count({ where: { applicant: { rt: { rwId: effectiveRwId } } } }),
                prisma.request.count({ where: { applicant: { rt: { rwId: effectiveRwId } }, status: 'VERIFIED_RT' } }),
                prisma.request.count({ where: { applicant: { rt: { rwId: effectiveRwId } }, status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
                prisma.request.count({ where: { applicant: { rt: { rwId: effectiveRwId } }, status: 'REJECTED' } }),
                prisma.pengaduan.count({ where: { rwId: effectiveRwId } }),
              ]);

              return {
                wilayahKewenangan: `RW ${rwInfo?.nomor || '-'} (Kewenangan Anda)`,
                angkaStatistikDashboard: {
                  totalWargaRw: rwWargaCount,
                  totalRt: rwRtCount,
                  totalPengajuan: rwRequestCount,
                  menungguApprovalRW: rwMenungguApprovalCount,
                  pengajuanSelesai: rwSelesaiCount,
                  pengajuanDitolak: rwDitolakCount,
                  totalPengaduan: rwPengaduanCount,
                },
                rekapWargaPerRt: rwInfo?.rts.map(r => ({
                  nomorRt: r.nomor,
                  namaKetuaRt: r.namaKetua || 'Belum terdaftar',
                  jumlahWarga: r._count.warga,
                  daftarWarga: r.warga.map((w) => ({
                    nama: w.namaLengkap,
                    username: w.user?.username || null,
                  })),
                })) || [],
                catatanPenting: `PENTING: Jumlah total warga di lingkungan RW Anda adalah ${rwWargaCount} warga yang tersebar di ${rwRtCount} RT.`,
              };
            }

            // Super Admin (Global System View)
            const [
              totalWarga,
              totalUser,
              totalKeluarga,
              totalRequest,
              totalPengajuanSelesai,
              totalPengajuanAktif,
              totalPengajuanDitolak,
              totalPengaduan,
              totalPengaduanPerluDitinjau,
              totalPengaduanDiproses,
              totalPengaduanSelesai,
              totalRt,
              totalRw,
              users,
              rtsWithWarga,
            ] = await Promise.all([
              prisma.warga.count({ where: { isActive: true } }),
              prisma.user.count(),
              prisma.keluarga.count(),
              prisma.request.count(),
              prisma.request.count({ where: { status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
              prisma.request.count({ where: { status: { notIn: ['DRAFT', 'APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'COMPLETED'] } } }),
              prisma.request.count({ where: { status: 'REJECTED' } }),
              prisma.pengaduan.count(),
              prisma.pengaduan.count({ where: { status: { in: ['DILAPORKAN', 'DITINJAU'] } } }),
              prisma.pengaduan.count({ where: { status: 'DIPROSES' } }),
              prisma.pengaduan.count({ where: { status: 'SELESAI' } }),
              prisma.rt.count(),
              prisma.rw.count(),
              prisma.user.findMany({
                select: {
                  username: true,
                  role: { select: { name: true } },
                  isActive: true,
                  warga: { select: { namaLengkap: true } },
                },
                take: 20,
              }),
              prisma.rt.findMany({
                where: rwScopeId ? { rwId: rwScopeId } : {},
                include: {
                  _count: { select: { warga: true } },
                  warga: {
                    select: {
                      namaLengkap: true,
                      user: { select: { username: true } },
                    },
                  },
                },
                orderBy: { nomor: 'asc' },
              }),
            ]);

            return {
              angkaStatistikDashboard: {
                totalWarga,
                totalRt,
                totalRw,
                totalPengajuan: totalRequest,
                pengajuanAktif: totalPengajuanAktif,
                pengajuanSelesai: totalPengajuanSelesai,
                pengajuanDitolak: totalPengajuanDitolak,
              },
              statistikPengaduan: {
                totalPengaduan,
                pengaduanPerluDitinjau: totalPengaduanPerluDitinjau,
                pengaduanDiproses: totalPengaduanDiproses,
                pengaduanSelesai: totalPengaduanSelesai,
              },
              rekapWargaPerRt: rtsWithWarga.map((r) => ({
                nomorRt: r.nomor,
                namaKetuaRt: r.namaKetua || 'Belum terdaftar',
                jumlahWarga: r._count.warga,
                daftarWarga: r.warga.map((w) => ({
                  nama: w.namaLengkap,
                  username: w.user?.username || null,
                })),
              })),
              totalAkunPengguna: totalUser,
              daftarAkun: users.map((u) => ({
                username: u.username,
                role: u.role.name,
                nama: u.warga?.namaLengkap || '-',
                status: u.isActive ? 'Aktif' : 'Nonaktif',
              })),
              totalKeluarga,
              catatanPenting: `PENTING: Jumlah total warga aktif terdaftar di database sistem adalah ${totalWarga} warga (sama persis dengan kartu 'Total Warga' di dashboard). Jumlah pengajuan surat yang telah SELESAI di database sistem berjumlah ${totalPengajuanSelesai} pengajuan (sama persis dengan kartu 'Pengajuan Selesai' di dashboard). Pengajuan aktif/diproses berjumlah ${totalPengajuanAktif} pengajuan, dan total seluruh pengajuan adalah ${totalRequest} pengajuan. Untuk pengaduan warga: total ${totalPengaduan} pengaduan (${totalPengaduanPerluDitinjau} perlu ditinjau, ${totalPengaduanDiproses} sedang diproses, ${totalPengaduanSelesai} selesai).`,
            };
          } catch (err) {
            return { error: 'Gagal mengambil statistik database.' };
          }
        }) as any,
      } as any);

      // 3b. Tool Data Warga Per RT Lengkap Beserta Akun User
      aiTools.get_data_warga_per_rt = tool({
        description: 'Mengambil rincian data kependudukan per RT secara terperinci: jumlah warga di setiap RT, daftar nama-nama warga di setiap RT, NIK, pekerjaan, dan akun pengguna (username user & role) yang terhubung. WAJIB dipanggil ketika pengguna menanyakan ada berapa warga di tiap RT, siapa saja nama warga di tiap RT, rincian warga per RT, atau nama warga beserta akun usernya.',
        parameters: z.object({
          nomorRt: z.string().optional().describe('Nomor RT tertentu (misal: "01", "02", "03"), atau kosongkan untuk melihat rincian seluruh RT'),
        }),
        execute: (async ({ nomorRt }: { nomorRt?: string }) => {
          try {
            if (isRtLeader && effectiveRtId) {
              const myRt = await prisma.rt.findUnique({
                where: { id: effectiveRtId },
                select: { nomor: true },
              });
              if (nomorRt && nomorRt.trim() !== '' && myRt && nomorRt.trim() !== myRt.nomor) {
                return {
                  error: `Akses ditolak: Anda adalah Ketua RT ${myRt.nomor}. Anda hanya berwenang melihat data kependudukan warga di RT ${myRt.nomor} Anda sendiri.`,
                };
              }
            }

            const rts = await prisma.rt.findMany({
              where: {
                ...(isRtLeader && effectiveRtId ? { id: effectiveRtId } : {}),
                ...(isRwLeader && effectiveRwId ? { rwId: effectiveRwId } : {}),
                ...(isSuperAdmin && rwScopeId ? { rwId: rwScopeId } : {}),
                ...(!isRtLeader && nomorRt ? { nomor: nomorRt.trim() } : {}),
              },
              include: {
                rw: { select: { nomor: true } },
                warga: {
                  where: { isActive: true },
                  include: {
                    user: {
                      select: {
                        username: true,
                        role: { select: { name: true } },
                        isActive: true,
                      },
                    },
                    keluarga: {
                      select: {
                        nomorKk: true,
                        alamat: true,
                      },
                    },
                  },
                  orderBy: { namaLengkap: 'asc' },
                },
              },
              orderBy: { nomor: 'asc' },
            });

            if (rts.length === 0) {
              return { message: 'Data RT tidak ditemukan di database.' };
            }

            const totalWarga = rts.reduce((sum, r) => sum + r.warga.length, 0);

            return {
              totalWargaKeseluruhan: totalWarga,
              rincianPerRt: rts.map((r) => ({
                nomorRt: r.nomor,
                namaKetuaRt: r.namaKetua || 'Belum terdaftar',
                wilayah: `RT ${r.nomor} / RW ${r.rw?.nomor || '-'}`,
                jumlahWarga: r.warga.length,
                daftarWarga: r.warga.map((w) => ({
                  id: w.id,
                  namaLengkap: w.namaLengkap,
                  nik: w.nik,
                  pekerjaan: w.pekerjaan || '-',
                  nomorKk: w.keluarga?.nomorKk || '-',
                  alamat: w.keluarga?.alamat || '-',
                  akunUser: w.user
                    ? `Terdaftar (Username: ${w.user.username}, Role: ${w.user.role.name}, Status: ${w.user.isActive ? 'Aktif' : 'Nonaktif'})`
                    : 'Belum memiliki akun',
                  username: w.user?.username || null,
                  role: w.user?.role?.name || null,
                })),
              })),
            };
          } catch (err) {
            return { error: 'Gagal mengambil data warga per RT dari database.' };
          }
        }) as any,
      } as any);

      // 4. Tool Pengajuan Surat
      aiTools.cari_pengajuan_surat = tool({
        description: 'Mencari pengajuan surat warga di database berdasarkan status atau nama pemohon, serta mengembalikan rekapitulasi jumlah pengajuan surat sesuai database sistem (Pengajuan Selesai, Aktif, Ditolak, Total) di wilayah kewenangan Anda.',
        parameters: z.object({
          query: z.string().optional().describe('Kata kunci pencarian nama pemohon atau status surat (misal: selesai, aktif, ditolak, nama pemohon, atau jenis layanan)'),
        }),
        execute: (async ({ query }: { query?: string }) => {
          try {
            let scopeFilter: any = {};
            if (isRtLeader && effectiveRtId) {
              scopeFilter = { applicant: { rtId: effectiveRtId } };
            } else if (isRwLeader && effectiveRwId) {
              scopeFilter = { applicant: { rt: { rwId: effectiveRwId } } };
            }

            const rawQ = query?.trim() || '';
            const q = rawQ.toLowerCase();

            // Mapping status alias bahasa Indonesia ke status Prisma
            let statusFilter: any = undefined;
            if (q) {
              if (q.includes('selesai') || q.includes('terbit') || q.includes('beres') || q.includes('document_issued') || q.includes('approved') || q.includes('completed')) {
                statusFilter = { in: ['DOCUMENT_ISSUED', 'APPROVED', 'COMPLETED'] };
              } else if (q.includes('aktif') || q.includes('proses') || q.includes('diproses') || q.includes('menunggu') || q.includes('submitted') || q.includes('pending')) {
                statusFilter = { notIn: ['DRAFT', 'APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'COMPLETED'] };
              } else if (q.includes('tolak') || q.includes('ditolak') || q.includes('rejected')) {
                statusFilter = 'REJECTED';
              }
            }

            const searchCondition: any = rawQ
              ? (statusFilter
                  ? { status: statusFilter }
                  : {
                      OR: [
                        { applicant: { namaLengkap: { contains: rawQ } } },
                        { serviceType: { name: { contains: rawQ } } },
                        { documentNumber: { contains: rawQ } },
                        { status: { contains: rawQ } },
                      ],
                    })
              : {};

            const whereCondition: any = {
              AND: [
                scopeFilter,
                searchCondition,
              ],
            };

            const [totalSemua, totalSelesai, totalAktif, totalDitolak, totalCocok, requests] = await Promise.all([
              prisma.request.count({ where: scopeFilter }),
              prisma.request.count({ where: { AND: [scopeFilter, { status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } }] } }),
              prisma.request.count({ where: { AND: [scopeFilter, { status: { notIn: ['DRAFT', 'APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'COMPLETED'] } }] } }),
              prisma.request.count({ where: { AND: [scopeFilter, { status: 'REJECTED' }] } }),
              prisma.request.count({ where: whereCondition }),
              prisma.request.findMany({
                where: whereCondition,
                include: {
                  applicant: { include: { rt: true } },
                  serviceType: true,
                },
                take: 15,
                orderBy: { createdAt: 'desc' },
              }),
            ]);

            return {
              rekapitulasiDatabaseGlobal: {
                totalPengajuan: totalSemua,
                pengajuanSelesai: totalSelesai,
                pengajuanAktif: totalAktif,
                pengajuanDitolak: totalDitolak,
              },
              totalHasilPencarian: totalCocok,
              daftarCuplikanDataTerbaru: requests.map((r) => ({
                id: r.id,
                pemohon: r.applicant?.namaLengkap || '-',
                wilayah: r.applicant?.rt ? `RT ${r.applicant.rt.nomor}` : '-',
                layanan: r.serviceType.name,
                status: r.status,
                nomorSurat: r.documentNumber || 'Belum terbit',
                tanggal: r.createdAt,
              })),
              peringatanPenting: `PERHATIAN: Total seluruh pengajuan yang telah SELESAI di wilayah kewenangan Anda berjumlah ${totalSelesai} pengajuan. Jumlah pengajuan AKTIF adalah ${totalAktif} pengajuan, dan total seluruh pengajuan adalah ${totalSemua} pengajuan. Jangan hanya menghitung jumlah item cuplikan array data di atas!`,
            };
          } catch (err) {
            return { error: 'Gagal mencari pengajuan surat di database.' };
          }
        }) as any,
      } as any);

      // 5. Tool Pengaduan Warga
      aiTools.cari_pengaduan_warga = tool({
        description: 'Mencari pengaduan warga di database berdasarkan kata kunci, status (selesai, dilaporkan, diproses), atau kategori, serta mengembalikan total rekapitulasi pengaduan database di wilayah kewenangan Anda.',
        parameters: z.object({
          query: z.string().optional().describe('Kata kunci judul, status (selesai, dilaporkan, proses), atau kategori pengaduan'),
        }),
        execute: (async ({ query }: { query?: string }) => {
          try {
            let scopeFilter: any = {};
            if (isRtLeader && effectiveRtId) {
              scopeFilter = { rtId: effectiveRtId };
            } else if (isRwLeader && effectiveRwId) {
              scopeFilter = { rwId: effectiveRwId };
            }

            const rawQ = query?.trim() || '';
            const q = rawQ.toLowerCase();

            let statusFilter: any = undefined;
            if (q) {
              if (q.includes('selesai')) {
                statusFilter = 'SELESAI';
              } else if (q.includes('lapor') || q.includes('tinjau')) {
                statusFilter = { in: ['DILAPORKAN', 'DITINJAU'] };
              } else if (q.includes('proses') || q.includes('aktif')) {
                statusFilter = 'DIPROSES';
              }
            }

            const searchCondition: any = rawQ
              ? (statusFilter
                  ? { status: statusFilter }
                  : {
                      OR: [
                        { judul: { contains: rawQ } },
                        { deskripsi: { contains: rawQ } },
                        { status: { contains: rawQ } },
                        { kategori: { contains: rawQ } },
                      ],
                    })
              : {};

            const whereCondition: any = {
              AND: [
                scopeFilter,
                searchCondition,
              ],
            };

            const [totalSemua, totalPerluDitinjau, totalDiproses, totalSelesai, totalCocok, pengaduanList] = await Promise.all([
              prisma.pengaduan.count({ where: scopeFilter }),
              prisma.pengaduan.count({ where: { AND: [scopeFilter, { status: { in: ['DILAPORKAN', 'DITINJAU'] } }] } }),
              prisma.pengaduan.count({ where: { AND: [scopeFilter, { status: 'DIPROSES' }] } }),
              prisma.pengaduan.count({ where: { AND: [scopeFilter, { status: 'SELESAI' }] } }),
              prisma.pengaduan.count({ where: whereCondition }),
              prisma.pengaduan.findMany({
                where: whereCondition,
                include: { pelapor: { include: { rt: true } }, rt: true },
                take: 15,
                orderBy: { createdAt: 'desc' },
              }),
            ]);

            return {
              rekapitulasiPengaduanGlobal: {
                totalPengaduan: totalSemua,
                pengaduanPerluDitinjau: totalPerluDitinjau,
                pengaduanDiproses: totalDiproses,
                pengaduanSelesai: totalSelesai,
              },
              totalCocokDenganPencarian: totalCocok,
              daftarCuplikanPengaduan: pengaduanList.map((p) => ({
                id: p.id,
                judul: p.judul,
                kategori: p.kategori,
                status: p.status,
                wilayah: p.rt ? `RT ${p.rt.nomor}` : '-',
                pelapor: p.pelapor?.namaLengkap || '-',
                tanggal: p.createdAt,
              })),
              peringatanPenting: `PERHATIAN: Total seluruh pengaduan di wilayah kewenangan Anda adalah ${totalSemua} pengaduan (${totalPerluDitinjau} perlu ditinjau/dilaporkan, ${totalDiproses} sedang diproses, ${totalSelesai} selesai). Jangan hanya menghitung jumlah baris cuplikan data (yang dibatasi 15 data)!`,
            };
          } catch (err) {
            return { error: 'Gagal mencari pengaduan warga di database.' };
          }
        }) as any,
      } as any);
    }

    // Tool mandiri untuk Warga (serta pengurus/admin yang memiliki akun warga terhubung)
    if (!isPrivilegedAdminRole || session?.wargaId) {
      // 1. Tool Pengajuan Surat Warga
      aiTools.check_request_status = tool({
        description: 'Mengecek status dan seluruh riwayat pengajuan surat/dokumen milik warga yang sedang login saat ini dari database. Menampilkan rincian status, tanggal, nomor surat, catatan RT/RW, dan link dokumen bila selesai.',
        parameters: z.object({}),
        execute: (async () => {
          if (!session || !session.wargaId) {
            return { error: 'Anda harus login terlebih dahulu sebagai Warga untuk mengecek status.' };
          }
          
          try {
            const [totalPengajuan, pendingPengajuan, selesaiPengajuan, ditolakPengajuan, requests] = await Promise.all([
              prisma.request.count({ where: { applicantId: session.wargaId } }),
              prisma.request.count({ where: { applicantId: session.wargaId, status: { notIn: ['DRAFT', 'APPROVED', 'DOCUMENT_ISSUED', 'REJECTED', 'COMPLETED'] } } }),
              prisma.request.count({ where: { applicantId: session.wargaId, status: { in: ['APPROVED', 'COMPLETED', 'DOCUMENT_ISSUED'] } } }),
              prisma.request.count({ where: { applicantId: session.wargaId, status: 'REJECTED' } }),
              prisma.request.findMany({
                where: { applicantId: session.wargaId },
                include: {
                  serviceType: true,
                  histories: {
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                  },
                },
                orderBy: { createdAt: 'desc' },
              }),
            ]);

            if (requests.length === 0) {
              return { message: 'Anda belum memiliki riwayat pengajuan surat apapun di sistem.' };
            }

            return {
              ringkasanKartuDashboardSaya: {
                totalPengajuan,
                sedangDiproses: pendingPengajuan,
                selesai: selesaiPengajuan,
                ditolak: ditolakPengajuan,
              },
              daftarPengajuan: requests.map((req: any) => ({
                id: req.id,
                layanan: req.serviceType.name,
                status: req.status,
                documentNumber: req.documentNumber || null,
                documentToken: req.documentToken || null,
                tanggalPengajuan: req.createdAt,
                catatanTerakhir: req.histories[0]?.note || '-',
                riwayatStatus: req.histories.map((h: any) => ({
                  status: h.status,
                  catatan: h.note || '-',
                  tanggal: h.createdAt,
                })),
              })),
            };
          } catch (error) {
            return { error: 'Gagal mengecek status pengajuan karena kendala sistem database.' };
          }
        }) as any,
      } as any);

      // 2. Tool Pengaduan Warga
      aiTools.cek_pengaduan_warga = tool({
        description: 'Mengecek status dan riwayat pengaduan warga yang diajukan oleh pengguna saat ini atau pengaduan lingkungan dari database.',
        parameters: z.object({
          semuaLingkungan: z.boolean().optional().describe('True jika ingin melihat pengaduan fasilitas umum di lingkungan RW, default false untuk pengaduan pribadi'),
        }),
        execute: (async ({ semuaLingkungan }: { semuaLingkungan?: boolean }) => {
          if (!session || !session.wargaId) {
            return { error: 'Anda harus login terlebih dahulu sebagai Warga untuk mengecek pengaduan.' };
          }

          try {
            const pengaduanList = await prisma.pengaduan.findMany({
              where: semuaLingkungan && rwScopeId
                ? { rwId: rwScopeId }
                : { pelaporId: session.wargaId },
              include: {
                history: {
                  orderBy: { createdAt: 'desc' },
                  take: 2,
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            });

            if (pengaduanList.length === 0) {
              return { message: 'Tidak ditemukan data pengaduan di sistem.' };
            }

            return pengaduanList.map((p) => ({
              id: p.id,
              judul: p.judul,
              kategori: p.kategori,
              deskripsi: p.deskripsi,
              lokasi: p.lokasi,
              status: p.status,
              tanggal: p.createdAt,
              catatanTerakhir: p.history[0]?.catatan || '-',
            }));
          } catch (err) {
            return { error: 'Gagal mengambil data pengaduan dari database.' };
          }
        }) as any,
      } as any);

      // 3. Tool Data Keluarga / Kartu Keluarga
      aiTools.cek_data_keluarga = tool({
        description: 'Melihat data keluarga dan susunan anggota keluarga dalam satu Kartu Keluarga (KK) milik warga yang sedang login saat ini dari database.',
        parameters: z.object({}),
        execute: (async () => {
          if (!session || !session.wargaId) {
            return { error: 'Anda harus login terlebih dahulu sebagai Warga untuk melihat data keluarga.' };
          }

          try {
            const warga = await prisma.warga.findUnique({
              where: { id: session.wargaId },
              include: {
                keluarga: {
                  include: {
                    warga: {
                      select: {
                        id: true,
                        namaLengkap: true,
                        agama: true,
                        pekerjaan: true,
                        isActive: true,
                      },
                    },
                  },
                },
                rt: {
                  include: { rw: true },
                },
              },
            });

            if (!warga || !warga.keluarga) {
              return { message: 'Data Kartu Keluarga belum terhubung dengan akun Anda.' };
            }

            return {
              nomorKk: warga.keluarga.nomorKk,
              alamat: warga.keluarga.alamat,
              wilayah: warga.rt ? `RT ${warga.rt.nomor} / RW ${warga.rt.rw?.nomor || '-'}` : '-',
              totalAnggota: warga.keluarga.warga.length,
              anggotaKeluarga: warga.keluarga.warga.map((m: any, idx: number) => ({
                no: idx + 1,
                namaLengkap: m.namaLengkap,
                pekerjaan: m.pekerjaan || '-',
                agama: m.agama || '-',
                status: m.isActive ? 'Aktif' : 'Nonaktif',
              })),
            };
          } catch (err) {
            return { error: 'Gagal mengambil data keluarga dari database.' };
          }
        }) as any,
      } as any);

      // 4. Tool Profil Warga Mandiri
      aiTools.cek_profil_saya = tool({
        description: 'Melihat data profil kependudukan lengkap milik warga yang sedang login saat ini dari database (nama, wilayah RT/RW, alamat, pekerjaan, agama, status akun).',
        parameters: z.object({}),
        execute: (async () => {
          if (!session || !session.wargaId) {
            return { error: 'Anda harus login terlebih dahulu sebagai Warga untuk melihat profil.' };
          }

          try {
            const warga = await prisma.warga.findUnique({
              where: { id: session.wargaId },
              include: {
                keluarga: true,
                rt: { include: { rw: true } },
                user: { select: { username: true, isActive: true, role: { select: { name: true } } } },
              },
            });

            if (!warga) {
              return { message: 'Data profil kependudukan tidak ditemukan di database.' };
            }

            return {
              namaLengkap: warga.namaLengkap,
              username: warga.user?.username || '-',
              role: warga.user?.role?.name || 'WARGA',
              nomorKk: warga.keluarga?.nomorKk || '-',
              alamat: warga.keluarga?.alamat || '-',
              wilayah: warga.rt ? `RT ${warga.rt.nomor} / RW ${warga.rt.rw?.nomor || '-'}` : '-',
              ketuaRt: warga.rt?.namaKetua || '-',
              ketuaRw: warga.rt?.rw?.namaKetua || '-',
              pekerjaan: warga.pekerjaan || '-',
              agama: warga.agama || '-',
              statusAkun: warga.user?.isActive ? 'Aktif' : 'Nonaktif',
            };
          } catch (err) {
            return { error: 'Gagal mengambil profil warga dari database.' };
          }
        }) as any,
      } as any);
    }

    let modelId = systemConfig.aiModel || 'gemini-3.5-flash-lite';
    if (
      modelId === 'gemini-1.5-flash' ||
      modelId === 'gemini-1.5-pro' ||
      modelId === 'gemini-2.0-flash' ||
      modelId === 'gemini-2.5-flash' ||
      modelId === 'gemini-2.5-flash-lite'
    ) {
      modelId = 'gemini-3.5-flash-lite';
    }

    const temperature =
      typeof systemConfig.aiTemperature === 'number'
        ? systemConfig.aiTemperature
        : 0.2;
    const maxTokens =
      typeof systemConfig.aiMaxTokens === 'number'
        ? systemConfig.aiMaxTokens
        : 1500;

    // 4. Fungsi pembantu asynchronous untuk mencoba menjalankan streamText dengan API Key tertentu
    async function attemptAIRequest(apiKey: string, keyLabel: string) {
      if (!apiKey) {
        throw new Error(`API Key ${keyLabel} tidak tersedia.`);
      }

      console.log(`[ROTASI API] Sedang mencoba menggunakan API Key ${keyLabel}...`);
      // Inisialisasi ulang provider Google Gemini pada setiap percobaan rotasi
      const googleProvider = createGoogleGenerativeAI({ apiKey });

      const result = await streamText({
        model: (googleProvider as any)(modelId, {
          thinking: { type: 'disabled' },
        }),
        system: systemPrompt,
        messages: coreMessages as any,
        tools: aiTools,
        temperature,
        maxOutputTokens: maxTokens,
        stopWhen: isStepCount(3),
      });

      // Deteksi dini error autentikasi (401/400 API_KEY_INVALID) sebelum me-return stream ke browser
      await Promise.race([
        result.response,
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      console.log(`[ROTASI API] ✅ BERHASIL terhubung menggunakan API Key ${keyLabel}!`);
      return result.toUIMessageStreamResponse({
        onError: (error: any) => {
          const errStr = String(error?.message || error);
          require('fs').writeFileSync('ai-error.log', errStr + '\n' + String(error?.stack));
          console.error(`Stream Error (API Key ${keyLabel}):`, error);
          if (errStr.includes('high demand') || errStr.includes('503')) {
            return 'Model AI sedang mengalami lonjakan antrean tinggi dari Google (503 High Demand). Silakan coba kirim ulang pertanyaan Anda.';
          }
          return 'Terjadi kendala pada layanan AI. Silakan coba beberapa saat lagi.';
        },
      });
    }

    // 5. Logika fallback try-catch bersarang (Utama -> Cadangan 1 -> Cadangan 2)
    let lastError: any = null;

    try {
      return await attemptAIRequest(primaryKey, 'Utama');
    } catch (errPrimary: any) {
      lastError = errPrimary;
      console.warn(`[ROTASI API] ⚠️ Gagal menggunakan kunci utama (${errPrimary?.message || errPrimary}).`);

      if (backupKey1) {
        console.log('[ROTASI API] Gagal menggunakan kunci utama, mencoba cadangan 1...');
        try {
          return await attemptAIRequest(backupKey1, 'Cadangan 1');
        } catch (errBackup1: any) {
          lastError = errBackup1;
          console.warn(`[ROTASI API] ⚠️ Gagal menggunakan kunci cadangan 1 (${errBackup1?.message || errBackup1}).`);

          if (backupKey2) {
            console.log('[ROTASI API] Gagal menggunakan kunci cadangan 1, mencoba cadangan 2...');
            try {
              return await attemptAIRequest(backupKey2, 'Cadangan 2');
            } catch (errBackup2: any) {
              lastError = errBackup2;
              console.error(`[ROTASI API] ❌ Gagal menggunakan kunci cadangan 2 (${errBackup2?.message || errBackup2}).`);
            }
          }
        }
      } else if (backupKey2) {
        console.log('[ROTASI API] Cadangan 1 tidak dikonfigurasi, mencoba cadangan 2...');
        try {
          return await attemptAIRequest(backupKey2, 'Cadangan 2');
        } catch (errBackup2: any) {
          lastError = errBackup2;
          console.error(`[ROTASI API] ❌ Gagal menggunakan kunci cadangan 2 (${errBackup2?.message || errBackup2}).`);
        }
      }
    }

    // JIKA SEMUA GAGAL: Kembalikan pesan error fallback ke frontend
    const lastErrStr = String(lastError?.message || lastError || '');
    console.error('[AI Key Rotation] Semua API Key telah dicoba dan gagal:', lastErrStr);

    let userErrorMessage = 'Semua kuota API Key AI sedang sibuk atau mengalami kendala teknis. Silakan coba beberapa saat lagi.';
    let statusCode = 503;
    if (lastErrStr.includes('429') || lastErrStr.includes('quota') || lastErrStr.includes('RESOURCE_EXHAUSTED')) {
      userErrorMessage = 'Batas kuota API Gemini telah tercapai pada seluruh API Key (429 Quota Exceeded). Mohon tunggu sejenak atau perbarui API Key cadangan di menu Konfigurasi.';
      statusCode = 429;
    } else if (lastErrStr.includes('503') || lastErrStr.includes('high demand') || lastErrStr.includes('overloaded')) {
      userErrorMessage = 'Model AI sedang mengalami lonjakan antrean tinggi dari Google (503 High Demand). Silakan coba kirim ulang pertanyaan Anda.';
      statusCode = 503;
    }

    return new Response(
      JSON.stringify({ error: userErrorMessage, details: lastErrStr }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Catch Block Error:", error);
    return new Response(
      JSON.stringify({ error: 'Layanan AI sedang sibuk atau mengalami gangguan sementara.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
