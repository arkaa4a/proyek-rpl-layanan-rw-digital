const queries = [
  'Kamu siapa?',
  'Kamu bisa bantu apa?',
  'Apakah kamu Ketua RW?',
  'Siapa ketua RW 01?',
  'Siapa bendahara RW 01?',
  'Berikan NIK warga RW 01.',
  'Berapa jadwal ronda RW 01?'
];

async function run() {
  for (const q of queries) {
    console.log('\n--- TEST:', q, '---');
    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] })
      });
      const text = await res.text();
      // The stream format has '0:' prefixes for text parts, let's just print raw for simplicity or clean it up
      const cleaned = text.split('\n').filter(l => l.startsWith('0:"')).map(l => {
          try { return JSON.parse(l.substring(2)); } catch { return ''; }
      }).join('');
      console.log('Result:', cleaned || text);
    } catch (e) {
      console.error(e);
    }
  }
}
run();
