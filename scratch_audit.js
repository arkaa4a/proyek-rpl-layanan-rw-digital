const { encrypt } = require('./src/lib/session.ts');

async function test() {
  console.log('=== TEST 1: WARGA AKSES /dashboard/kartu-keluarga ===');
  const tokenWarga = await encrypt({
    id: 'cf967833-db72-488e-8f55-5c6aa8d0331f',
    username: 'warga1',
    role: 'WARGA',
    wargaId: 'c2c9d4fa-40d7-4889-8614-f527bc7dd71d'
  });

  const resWarga = await fetch('http://localhost:3000/dashboard/kartu-keluarga', {
    headers: { Cookie: `session=${tokenWarga}` },
    redirect: 'manual'
  });
  console.log('Status:', resWarga.status);
  const html = await resWarga.text();

  console.log('Contains "Data Kartu Keluarga":', html.includes('Data Kartu Keluarga'));
  console.log('Contains masked KK (3201********0001):', html.includes('3201********0001'));
  console.log('Does NOT contain unmasked KK (3201010101010001):', !html.includes('3201010101010001'));
  console.log('Contains masked NIK (3201********0002):', html.includes('3201********0002'));
  console.log('Does NOT contain unmasked NIK (3201010101010002):', !html.includes('3201010101010002'));
  console.log('Contains nama "Candra Warga":', html.includes('Candra Warga'));
  console.log('Contains status "Terdaftar di Sistem":', html.includes('Terdaftar di Sistem'));
  console.log('Contains RT/RW (RT 01 / RW 01):', html.includes('RT 01') && html.includes('RW 01'));
  console.log('Navbar link /dashboard/kartu-keluarga exists:', html.includes('href="/dashboard/kartu-keluarga"'));

  console.log('\n=== TEST 2: KETUA_RT AKSES /dashboard/kartu-keluarga ===');
  const tokenRT = await encrypt({
    id: '3ba8bae9-253a-4989-88e2-de2494071be6',
    username: 'ketuart',
    role: 'KETUA_RT',
    rtId: '5b6406c7-cace-40e5-a835-be335603e38e'
  });
  const resRT = await fetch('http://localhost:3000/dashboard/kartu-keluarga', {
    headers: { Cookie: `session=${tokenRT}` },
    redirect: 'manual'
  });
  console.log('Status (expected 307):', resRT.status, 'Location:', resRT.headers.get('location'));

  console.log('\n=== TEST 3: GUEST AKSES /dashboard/kartu-keluarga ===');
  const resGuest = await fetch('http://localhost:3000/dashboard/kartu-keluarga', {
    redirect: 'manual'
  });
  console.log('Status (expected 307):', resGuest.status, 'Location:', resGuest.headers.get('location'));

  console.log('\n=== TEST 4: AI ASSISTANT CHECK ===');
  const resAI = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'halo' }] })
  });
  console.log('AI status (expected 200):', resAI.status);
}

test().catch(console.error);
