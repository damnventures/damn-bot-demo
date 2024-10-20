/* eslint-disable simple-import-sort/imports */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from 'next/image';
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { VoiceClientAudio, VoiceClientProvider, useVoiceClient } from "realtime-ai-react";
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
  const voiceClient = useVoiceClient();

  useEffect(() => {
    if (voiceClient) {
      voiceClient.on('transcript', (data: string) => {
        setStoryText((prevStory) => prevStory + data);
        setConversation(prev => [...prev, { role: 'assistant', content: data }]);

        const match = data.match(/<([^>]+)>/);
        if (match) {
          setImagePrompt(match[1]);
        }
      });

      voiceClient.on('genericMessage', (data: unknown) => {
        console.log("Generic message received:", data);
        if (typeof data === 'object' && data !== null && 'content' in data) {
          const content = (data as any).content;
          if (typeof content === 'string') {
            setStoryText((prevStory) => prevStory + content);
            setConversation(prev => [...prev, { role: 'assistant', content }]);

            const match = content.match(/<([^>]+)>/);
            if (match) {
              setImagePrompt(match[1]);
            }
          }
        }
      });
    }

    return () => {
      if (voiceClient) {
        voiceClient.off('transcript');
        voiceClient.off('genericMessage');
      }
    };
  }, [voiceClient]);

  const handleUserInput = async (input: string) => {
    if (voiceClient) {
      setConversation(prev => [...prev, { role: 'user', content: input }]);
      await voiceClient.sendTextMessage(input);
    }
  };

  if (showSplash) {
    return <Splash handleReady={() => setShowSplash(false)} />;
  }

  return (
    <VoiceClientProvider>
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
                disabled={!voiceClient}
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