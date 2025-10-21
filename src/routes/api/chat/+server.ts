import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

import { GEMINI_API_KEY } from '$env/static/private';

const gemini = createGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY,
});

export async function POST({ request }) {
  const { messages } = await request.json();
  console.log(JSON.stringify(messages))

  const result = streamText({
    model: gemini('gemini-2.0-flash'),
    messages,
    system:`JSONの人物になりきって回答してください。${JSON.stringify(messages[0].data)}`
  });

  return result.toDataStreamResponse();
}
