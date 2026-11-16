const queries = [
  'Kamu siapa?',
  'Siapa ketua RW 01?',
  'Kamu bisa bantu apa?'
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
