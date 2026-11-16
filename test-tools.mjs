import { generateText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

process.env.GOOGLE_GENERATIVE_AI_API_KEY='AQ.Ab8RN6KIvqy5_N3FlIQlHowiUmOqgU5y--AHWG0l57eTnM_X6Q';

async function main() {
  try {
    const { text, toolCalls } = await generateText({
      model: google('models/gemini-3.6-flash'),
      prompt: 'Cek status pengajuan saya',
      tools: {
        check_request_status: tool({
          description: 'Mengecek status',
          parameters: z.object({}),
          execute: async () => {
            console.log("TOOL CALLED");
            return { result: "Success" };
          }
        })
      }
    });
    console.log('Success:', text, toolCalls);
  } catch (e) {
    console.error('Error:', e);
  }
}
main();
