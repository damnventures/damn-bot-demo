/* eslint-disable simple-import-sort/imports */

import { defaultBotProfile, defaultMaxDuration, defaultLLMPrompt } from "./../../rtvi.config";

export async function POST(request: Request) {
  try {
    const { services, config } = await request.json();
    if (!services || !config || !process.env.DAILY_BOTS_URL) {
      console.error('Missing services, config, or DAILY_BOTS_URL');
      return new Response(`Services, config, or DAILY_BOTS_URL not found`, {
        status: 400,
      });
    }
    const payload = {
      bot_profile: defaultBotProfile,
      max_duration: defaultMaxDuration,
      services,
      api_keys: {
        openai: process.env.OPENAI_API_KEY,
      },
      config: [
        ...config,
        {
          service: "llm",
          options: [
            {
              name: "initial_messages",
              value: [
                {
                  role: "system",
                  content: defaultLLMPrompt,
                },
              ],
            },
          ],
        },
      ],
    };
    console.log('Payload being sent to Daily Bots:', JSON.stringify(payload, null, 2));
    const req = await fetch(process.env.DAILY_BOTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const res = await req.json();
    console.log('Response from Daily Bots:', JSON.stringify(res, null, 2));
    if (req.status !== 200) {
      console.error('Error response from Daily Bots:', req.status, res);
      return Response.json(res, { status: req.status });
    }
    return Response.json(res);
  } catch (error) {
    console.error('Error in API route:', error);
    if (error instanceof Error) {
      return new Response(`Internal Server Error: ${error.message}`, {
        status: 500,
      });
    } else {
      return new Response('Internal Server Error', {
        status: 500,
      });
    }
  }
}