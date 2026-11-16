const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    
    if (data.models) {
      console.log('Available Models:');
      data.models.forEach(m => console.log(m.name));
    } else {
        console.log(data);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
listModels();
