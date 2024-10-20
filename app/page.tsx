/* eslint-disable simple-import-sort/imports */
"use client";
import { useEffect, useRef, useState } from "react";
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

// New component for text conversation display
const ConversationDisplay = ({ conversation }) => (
  <div className="conversation-display">
    {conversation.map((message, index) => (
      <div key={index} className={`message ${message.role}`}>
        <strong>{message.role === 'user' ? 'You' : 'Storyteller'}:</strong> {message.content}
      </div>
    ))}
  </div>
);

// New component for DALL-E image generation
const DalleImageGenerator = ({ imagePrompt }) => {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (imagePrompt) {
      // Here you would typically call your DALL-E API
      // For this example, we'll just use a placeholder
      setImageUrl(`https://via.placeholder.com/300x200?text=${encodeURIComponent(imagePrompt)}`);
    }
  }, [imagePrompt]);

  return imageUrl ? <img src={imageUrl} alt="Generated story scene" /> : null;
};

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [storyText, setStoryText] = useState("");
  const [conversation, setConversation] = useState([]);
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
    });
    const llmHelper = new LLMHelper({});
    voiceClient.registerHelper("llm", llmHelper);
    voiceClientRef.current = voiceClient;

    // Add message handler for storytelling
    voiceClient.on("llmJsonCompletion", (data: any) => {
      if (typeof data.content === "string") {
        setStoryText((prevStory) => prevStory + data.content);
        setConversation(prev => [...prev, { role: 'assistant', content: data.content }]);

        // Extract image prompt
        const match = data.content.match(/<([^>]+)>/);
        if (match) {
          setImagePrompt(match[1]);
        }
      }
    });
  }, [showSplash]);

  const handleUserInput = (input: string) => {
    setConversation(prev => [...prev, { role: 'user', content: input }]);
    voiceClientRef.current?.sendText(input);
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