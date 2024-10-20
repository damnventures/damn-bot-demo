/* eslint-disable simple-import-sort/imports */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from 'next/image';
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { VoiceClientAudio, VoiceClientProvider, useVoiceClient } from "realtime-ai-react";
import { VoiceMessage, LLMHelper } from "realtime-ai";
import { AppProvider } from "@/components/context";
import Header from "@/components/Header";
import Splash from "@/components/Splash";
import StoryVisualizer from "@/components/StoryVisualizer";
import App from "@/components/App";
import { DailyVoiceClient } from "realtime-ai-daily";
import {
  BOT_READY_TIMEOUT,
  defaultConfig,
  defaultServices,
} from "@/rtvi.config";

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

class CustomVoiceMessage implements VoiceMessage {
  id: string;
  type: 'audio';
  data: { content: string };
  label: 'rtvi-ai';

  constructor(input: string) {
    this.id = Date.now().toString();
    this.type = 'audio';
    this.data = { content: input };
    this.label = 'rtvi-ai';
  }

  serialize(): string {
    return JSON.stringify({
      id: this.id,
      type: this.type,
      data: this.data,
      label: this.label
    });
  }
}

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
  const [showSplash, setShowSplash] = useState(true);
  const voiceClientRef = useRef<DailyVoiceClient | null>(null);
  const [storyText, setStoryText] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!showSplash || voiceClientRef.current) {
      return;
    }

    const voiceClient = new DailyVoiceClient({
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "/api",
      services: defaultServices,
      config: [
        ...defaultConfig,
        {
          service: "vad",
          options: [
            { name: "params", value: { stop_secs: 1 } }
          ]
        },
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
      timeout: BOT_READY_TIMEOUT,
    });

    const llmHelper = new LLMHelper({});
    voiceClient.registerHelper("llm", llmHelper);

    voiceClientRef.current = voiceClient;
  }, [showSplash]);

  const handleUserInput = useCallback(async (input: string) => {
  if (!voiceClientRef.current) return;

  setIsLoading(true);
  try {
    // Add user message to conversation
    setConversation(prev => [...prev, { role: 'user', content: input }]);

    // Create a CustomVoiceMessage object
    const message = new CustomVoiceMessage(input);

    console.log("Sending message:", JSON.stringify(message, null, 2));

    // Send message to voice client
    const response = await voiceClientRef.current.sendMessage(message);

    console.log("Message sent successfully. Server response:", response);

    // For now, we'll use a placeholder. In a real application, you'd process the actual response.
    const placeholderResponse = "I've received your message. [Placeholder for AI response]";

    // Add AI response to conversation
    setConversation(prev => [...prev, { role: 'assistant', content: placeholderResponse }]);

    // Update story text
    setStoryText(prev => prev + " " + placeholderResponse);

    // Clear input field
    setInputValue("");
  } catch (error: unknown) {
    console.error("Error sending message:", error);
    if (error instanceof Error) {
      setError(`Failed to send message: ${error.message}`);
    } else if (typeof error === 'object' && error !== null) {
      setError(`Failed to send message: ${JSON.stringify(error, null, 2)}`);
    } else {
      setError('Failed to send message: An unknown error occurred');
    }
  } finally {
    setIsLoading(false);
  }
}, [voiceClientRef]);

// Add this useEffect to set up an error listener
useEffect(() => {
  if (voiceClientRef.current) {
    const errorHandler = (error: unknown) => {
      console.error("VoiceClient error:", error);
      if (error instanceof Error) {
        setError(`VoiceClient error: ${error.message}`);
      } else if (typeof error === 'object' && error !== null) {
        setError(`VoiceClient error: ${JSON.stringify(error, null, 2)}`);
      } else {
        setError('VoiceClient error: An unknown error occurred');
      }
      setIsLoading(false); // Ensure loading state is reset on error
    };

    voiceClientRef.current.on('error', errorHandler);

    return () => {
      voiceClientRef.current?.off('error', errorHandler);
    };
  }
}, [voiceClientRef.current]);

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
              {voiceClientRef.current ? (
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