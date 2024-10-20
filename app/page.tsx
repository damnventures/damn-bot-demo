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
  const [showSplash, setShowSplash] = useState(true);
  const [storyText, setStoryText] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const voiceClient = useVoiceClient();

  useEffect(() => {
    console.log("Voice client:", voiceClient);
  }, [voiceClient]);

  const handleBotTranscript = useCallback((data: string) => {
    console.log("Bot transcript received:", data);
    setStoryText((prevStory) => prevStory + data);
    setConversation(prev => [...prev, { role: 'assistant', content: data }]);

    const match = data.match(/<([^>]+)>/);
    if (match) {
      setImagePrompt(match[1]);
    }
  }, []);

  const handleError = useCallback((message: any) => {
    console.error("Error:", message);
    setError(message.toString());
  }, []);

  useEffect(() => {
    if (voiceClient) {
      console.log("Setting up voice client listeners");
      voiceClient.on('botTranscript', handleBotTranscript);
      voiceClient.on('error', handleError);
    }

    return () => {
      if (voiceClient) {
        console.log("Removing voice client listeners");
        voiceClient.off('botTranscript', handleBotTranscript);
        voiceClient.off('error', handleError);
      }
    };
  }, [voiceClient, handleBotTranscript, handleError]);

  const handleUserInput = async (input: string) => {
    if (voiceClient) {
      setConversation(prev => [...prev, { role: 'user', content: input }]);
      try {
        console.log("Sending message:", input);
        const message: VoiceMessage = {
          id: Date.now().toString(),
          type: 'text',
          label: 'User Input',
          data: input,
          serialize: () => JSON.stringify({ type: 'text', data: input })
        };
        await voiceClient.sendMessage(message);
      } catch (error) {
        console.error("Failed to send user input:", error);
        setError(`Failed to send message: ${error}`);
      }
    } else {
      console.error("Voice client is not available");
      setError("Voice client is not available");
    }
  };

  if (showSplash) {
    return <Splash handleReady={() => setShowSplash(false)} />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <AppProvider>
      <TooltipProvider>
        <main>
          <Header />
          <div id="app">
            <App />
            <StoryVisualizer storyText={storyText} />
            <ConversationDisplay conversation={conversation} />
            <DalleImageGenerator imagePrompt={imagePrompt} />
            {voiceClient ? (
              <input
                type="text"
                onKeyPress={(e) => e.key === 'Enter' && handleUserInput(e.currentTarget.value)}
                placeholder="Type your response here and press Enter"
              />
            ) : (
              <div>Loading voice client...</div>
            )}
          </div>
        </main>
        <aside id="tray" />
      </TooltipProvider>
    </AppProvider>
  );
}