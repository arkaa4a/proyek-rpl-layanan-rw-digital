const { generateText } = require('ai');
const { google } = require('@ai-sdk/google');

async function main() {
  try {
    console.log("Key:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "EXISTS" : "MISSING");
    const result = await generateText({
      model: google('models/gemini-1.5-flash'),
      prompt: 'Hello world, just answer "OK".',
    });
    console.log("Success:", result.text);
  } catch (err) {
    console.error("Failed:", err);
  }
}
main();
