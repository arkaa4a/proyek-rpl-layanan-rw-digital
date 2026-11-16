import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  try {
    const { text } = await generateText({
      model: google('models/gemini-1.5-flash'),
      prompt: 'Halo',
    });
    console.log("Success:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
