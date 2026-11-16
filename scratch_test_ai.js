const { generateText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
async function main() {
  try {
    const result = await generateText({
      model: google('gemini-flash-latest'),
      prompt: 'Siapa ketua RW 01?',
    });
    console.log('Success:', result.text);
  } catch (error) {
    console.error('AI SDK Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause.message);
    }
  }
}
main();
