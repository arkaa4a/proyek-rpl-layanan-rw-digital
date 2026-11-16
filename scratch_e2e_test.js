const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ask(prompt) {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
  });
  const text = await res.text();
  const lines = text.split('\n');
  let output = '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const json = JSON.parse(line.slice(6));
        if (json.type === 'text-delta' && json.delta) {
          output += json.delta;
        }
      } catch (e) {}
    }
  }
  return output || text;
}

async function run() {
  const tests = [
    { label: 'Test A', q: 'siapa rt di lingkungan sini' },
    { label: 'Test B', q: 'siapa ketua rw di sini' },
    { label: 'Test C', q: 'di kelurahan mana rw ini berada?' },
    { label: 'Test D', q: 'siapa bendahara rw?' },
    { label: 'Test E', q: 'buatkan kode Python' }
  ];

  for (const t of tests) {
    console.log(`=== ${t.label}: ${t.q} ===`);
    try {
      const ans = await ask(t.q);
      console.log(`Response:\n${ans.trim()}\n`);
    } catch (e) {
      console.error('Error:', e.message);
    }
    await sleep(2500);
  }
}

run();
