import React from 'react';

interface StoryVisualizerProps {
  storyText: string;
}

const StoryVisualizer: React.FC<StoryVisualizerProps> = ({ storyText }) => {
  const sentences = storyText.split('[break]');

  return (
    <div className="story-visualizer">
      {sentences.map((sentence, index) => {
        const matches = sentence.match(/<([^>]+)>/);
        const imagePrompt = matches ? matches[1] : '';
        const text = sentence.replace(/<[^>]+>/, '').trim();

        return (
          <div key={index} className="story-sentence">
            {imagePrompt && (
              <div className="image-placeholder">
                Image prompt: {imagePrompt}
              </div>
            )}
            <p>{text}</p>
          </div>
        );
      })}
    </div>
  );
};

export default StoryVisualizer;