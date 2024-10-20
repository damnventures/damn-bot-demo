"use client";

import { useEffect, useState } from "react";
import { DailyVoiceClient } from "realtime-ai-daily";
import { VoiceClientAudio, VoiceClientProvider } from "realtime-ai-react";
import App from "./App";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { AppProvider } from "@/components/context";
import Header from "@/components/Header";
import Splash from "@/components/Splash";
import StoryVisualizer from "@/components/StoryVisualizer";
import ConversationDisplay from "@/components/ConversationDisplay";
import DalleImageGenerator from "@/components/DalleImageGenerator";

interface Message {
  role: string;
  content: string;
}

export default function Home() {
  const [dailyVoiceClient, setDailyVoiceClient] = useState<DailyVoiceClient | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [storyText, setStoryText] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");

  useEffect(() => {
    if (dailyVoiceClient) {
      return;
    }
    const voiceClient = new DailyVoiceClient({
      baseUrl: "/api",
      services: {
        llm: "together",
        tts: "cartesia",
      },
      config: [
        {
          service: "tts",
          options: [
            { name: "voice", value: "79a125e8-cd45-4c13-8a67-188112f4dd22" },
          ],
        },
        {
          service: "llm",
          options: [
            {
              name: "model",
              value: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
            },
            {
              name: "initial_messages",
              value: [
                {
                  role: "system",
                  content:
                    "You are a assistant called ExampleBot. You can ask me anything. Keep responses brief and legible.",
                },
              ],
            },
            { name: "run_on_config", value: true },
          ],
        },
      ],
    });
    setDailyVoiceClient(voiceClient);

    voiceClient.on('botTranscript', (data: string) => {
      setStoryText((prevStory) => prevStory + data);
      setConversation(prev => [...prev, { role: 'assistant', content: data }]);

      const match = data.match(/<([^>]+)>/);
      if (match) {
        setImagePrompt(match[1]);
      }
    });

    voiceClient.on('error', (error: any) => {
      console.error("Voice client error:", error);
    });

    return () => {
      voiceClient.off('botTranscript');
      voiceClient.off('error');
    };
  }, [dailyVoiceClient]);

  if (showSplash) {
    return <Splash handleReady={() => setShowSplash(false)} />;
  }

  return (
    <VoiceClientProvider voiceClient={dailyVoiceClient!}>
      <AppProvider>
        <TooltipProvider>
          <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <Header />
            <div className="flex flex-col gap-4 items-center">
              <h1 className="text-4xl font-bold">My First Daily Bot</h1>
              <App />
              <StoryVisualizer storyText={storyText} />
              <ConversationDisplay conversation={conversation} />
              <DalleImageGenerator imagePrompt={imagePrompt} />
            </div>
          </main>
          <aside id="tray" />
        </TooltipProvider>
      </AppProvider>
      <VoiceClientAudio />
    </VoiceClientProvider>
  );
}