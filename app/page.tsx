/* eslint-disable simple-import-sort/imports */
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from 'next/image';
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { VoiceClientAudio, VoiceClientProvider, useVoiceClient } from "realtime-ai-react";
import { VoiceMessage } from "realtime-ai";
import { AppProvider } from "@/components/context";
import Header from "@/components/Header";
import Splash from "@/components/Splash";
import StoryVisualizer from "@/components/StoryVisualizer";
import App from "@/components/App";
import { DailyVoiceClient } from "realtime-ai-daily";

interface Message {
  role: string;
  content: string;
}

const ConversationDisplay: React.FC<{ conversation: Message[] }> = ({ conversation }) => (
  <div className="conversation-display">
    {conversation.map((message, index) => (
      <div key={index} className={`message ${message.role}`}>
        <strong>{message.role === 'user' ? 'You' : 'Storyteller'}:</strong> {message.content}
      </div>
    ))}
  </div>
);

const DalleImageGenerator: React.FC<{ imagePrompt: string }> = ({ imagePrompt }) => {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (imagePrompt) {
      setImageUrl(`https://via.placeholder.com/300x200?text=${encodeURIComponent(imagePrompt)}`);
    }
  }, [imagePrompt]);

  return imageUrl ? (
    <div style={{ position: 'relative', width: '300px', height: '200px' }}>
      <Image src={imageUrl} alt="Generated story scene" layout="fill" objectFit="contain" />
    </div>
  ) : null;
};

export default function Home() {
  const [dailyVoiceClient, setDailyVoiceClient] = useState<DailyVoiceClient | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [storyText, setStoryText] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!dailyVoiceClient) {
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
    }
  }, [dailyVoiceClient]);

  const handleUserInput = useCallback(async (input: string) => {
    if (!dailyVoiceClient) return;

    setIsLoading(true);
    try {
      // Add user message to conversation
      setConversation(prev => [...prev, { role: 'user', content: input }]);

      // Send message to voice client
      const response = await dailyVoiceClient.sendMessage(input);

      // Add AI response to conversation
      setConversation(prev => [...prev, { role: 'assistant', content: response.content }]);

      // Update story text (assuming the response includes the updated story)
      setStoryText(prev => prev + " " + response.content);

      // Clear input field
      setInputValue("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [dailyVoiceClient]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleUserInput(inputValue);
    }
  };

  if (showSplash) {
    return <Splash handleReady={() => setShowSplash(false)} />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <VoiceClientProvider voiceClient={dailyVoiceClient!}>
      <AppProvider>
        <TooltipProvider>
          <main>
            <Header />
            <div id="app">
              <App />
              <StoryVisualizer storyText={storyText} />
              <ConversationDisplay conversation={conversation} />
              <DalleImageGenerator imagePrompt={imagePrompt} />
              {dailyVoiceClient ? (
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response here and press Enter"
                  disabled={isLoading}
                />
              ) : (
                <div>Loading voice client...</div>
              )}
              {isLoading && <div>Processing your request...</div>}
            </div>
          </main>
          <aside id="tray" />
        </TooltipProvider>
      </AppProvider>
      <VoiceClientAudio />
    </VoiceClientProvider>
  );
}