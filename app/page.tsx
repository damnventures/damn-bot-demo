/* eslint-disable simple-import-sort/imports */
"use client";
import { useEffect, useRef, useState } from "react";
import Image from 'next/image';
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { LLMHelper } from "realtime-ai";
import { DailyVoiceClient } from "realtime-ai-daily";
import { VoiceClientAudio, VoiceClientProvider } from "realtime-ai-react";
import App from "@/components/App";
import { AppProvider } from "@/components/context";
import Header from "@/components/Header";
import Splash from "@/components/Splash";
import StoryVisualizer from "@/components/StoryVisualizer";
import {
  BOT_READY_TIMEOUT,
  defaultConfig,
  defaultServices,
} from "@/rtvi.config";

interface Message {
  role: string;
  content: string;
}

// New component for text conversation display
const ConversationDisplay: React.FC<{ conversation: Message[] }> = ({ conversation }) => (
  <div className="conversation-display">
    {conversation.map((message, index) => (
      <div key={index} className={`message ${message.role}`}>
        <strong>{message.role === 'user' ? 'You' : 'Storyteller'}:</strong> {message.content}
      </div>
    ))}
  </div>
);

// New component for DALL-E image generation
const DalleImageGenerator: React.FC<{ imagePrompt: string }> = ({ imagePrompt }) => {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (imagePrompt) {
      // Here you would typically call your DALL-E API
      // For this example, we'll just use a placeholder
      setImageUrl(`https://via.placeholder.com/300x200?text=${encodeURIComponent(imagePrompt)}`);

      // When integrating with a real image generation API, you'd do something like this:
      // const generateImage = async () => {
      //   const response = await fetch('/api/generate-image', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ prompt: imagePrompt }),
      //   });
      //   const data = await response.json();
      //   setImageUrl(data.imageUrl);
      // };
      // generateImage();
    }
  }, [imagePrompt]);

  return imageUrl ? (
    <div style={{ position: 'relative', width: '300px', height: '200px' }}>
      <Image src={imageUrl} alt="Generated story scene" layout="fill" objectFit="contain" />
    </div>
  ) : null;
};

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [storyText, setStoryText] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const voiceClientRef = useRef<DailyVoiceClient | null>(null);

  useEffect(() => {
    if (!showSplash || voiceClientRef.current) {
      return;
    }
    const voiceClient = new DailyVoiceClient({
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "/api",
      services: defaultServices,
      config: defaultConfig,
      timeout: BOT_READY_TIMEOUT,
      callbacks: {
        onBotReady: () => {
          console.log("Bot is ready!");
        },
        onBotTranscript: (data: string) => {
          setStoryText((prevStory) => prevStory + data);
          setConversation(prev => [...prev, { role: 'assistant', content: data }]);

          // Extract image prompt
          const match = data.match(/<([^>]+)>/);
          if (match) {
            setImagePrompt(match[1]);
          }
        },
        onGenericMessage: (data: unknown) => {
          console.log("Generic message received:", data);
          if (typeof data === 'object' && data !== null && 'content' in data) {
            const content = (data as any).content;
            if (typeof content === 'string') {
              setStoryText((prevStory) => prevStory + content);
              setConversation(prev => [...prev, { role: 'assistant', content }]);

              // Extract image prompt
              const match = content.match(/<([^>]+)>/);
              if (match) {
                setImagePrompt(match[1]);
              }
            }
          }
        },
        onError: (message: any) => {
          console.error("Error:", message);
        },
      },
    });

    voiceClientRef.current = voiceClient;

    // Remove the auto-start
    // voiceClient.start().catch((e) => {
    //   console.error("Failed to start voice client:", e);
    // });
  }, [showSplash]);

  const handleUserInput = async (input: string) => {
    setConversation(prev => [...prev, { role: 'user', content: input }]);

    if (voiceClientRef.current) {
      try {
        // Instead of using sendMessage, let's use the same approach as before
        await voiceClientRef.current.disconnect();

        const updatedConfig = [...defaultConfig];
        const llmConfig = updatedConfig.find(c => c.service === 'llm');
        if (llmConfig && llmConfig.options) {
          const initialMessages = llmConfig.options.find(o => o.name === 'initial_messages');
          if (initialMessages && Array.isArray(initialMessages.value)) {
            initialMessages.value.push({ role: 'user', content: input });
          }
        }

        const newVoiceClient = new DailyVoiceClient({
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "/api",
          services: defaultServices,
          config: updatedConfig,
          timeout: BOT_READY_TIMEOUT,
          callbacks: voiceClientRef.current.callbacks,
        });

        voiceClientRef.current = newVoiceClient;

        await newVoiceClient.start();
      } catch (error) {
        console.error("Failed to send user input:", error);
      }
    }
  };

  if (showSplash) {
    return <Splash handleReady={() => setShowSplash(false)} />;
  }

  return (
    <VoiceClientProvider voiceClient={voiceClientRef.current!}>
      <AppProvider>
        <TooltipProvider>
          <main>
            <Header />
            <div id="app">
              <App />
              <StoryVisualizer storyText={storyText} />
              <ConversationDisplay conversation={conversation} />
              <DalleImageGenerator imagePrompt={imagePrompt} />
              <input
                type="text"
                onKeyPress={(e) => e.key === 'Enter' && handleUserInput(e.currentTarget.value)}
                placeholder="Type your response here and press Enter"
              />
            </div>
          </main>
          <aside id="tray" />
        </TooltipProvider>
      </AppProvider>
      <VoiceClientAudio />
    </VoiceClientProvider>
  );
}