import React from "react";
import { Book, Info } from "lucide-react";
import { Button } from "./ui/button";

type SplashProps = {
  handleReady: () => void;
};

export const Splash: React.FC<SplashProps> = ({ handleReady }) => {
  return (
    <main className="w-full flex items-center justify-center bg-primary-200 p-4 bg-[length:auto_50%] lg:bg-auto bg-colorWash bg-no-repeat bg-right-top">
      <div className="flex flex-col gap-8 lg:gap-12 items-center max-w-full lg:max-w-3xl">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-balance text-left">
          Daily Bots Storyteller Demo
        </h1>
        <p className="text-primary-500 text-xl font-semibold leading-relaxed">
          Experience interactive storytelling with:
        </p>
        <ul className="list-disc list-inside text-primary-500 text-lg">
          <li>Claude 3.5 Sonnet</li>
          <li>Together Llama 3.1 8B</li>
          <li>Together Llama 3.1 70B</li>
          <li>Together Llama 3.1 405B</li>
          <li>GPT-4o mini</li>
        </ul>
        <Button onClick={() => handleReady()}>Start Your Story</Button>
        <div className="h-[1px] bg-primary-300 w-full" />
        <footer className="flex flex-col lg:gap-2">
          <Button variant="light" asChild>

              href="https://www.daily.co/products/daily-bots/"
              className="text-indigo-600"
            >
              <Info className="size-6" />
              Learn more about Daily Bots
            </a>
          </Button>
          <Button variant="light" asChild>

              href="https://github.com/daily-demos/daily-bots-web-demo"
              className="text-indigo-600"
            >
              <Book className="size-6" />
              Demo source code
            </a>
          </Button>
        </footer>
      </div>
    </main>
  );
};

export default Splash;