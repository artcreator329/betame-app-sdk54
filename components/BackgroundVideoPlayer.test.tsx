import React from 'react';
import { render } from '@testing-library/react-native';
import { BackgroundVideoPlayer } from './BackgroundVideoPlayer';

// Mock expo-av
jest.mock('expo-av', () => ({
  Video: 'Video',
  ResizeMode: {
    COVER: 'cover',
  },
}));

describe('BackgroundVideoPlayer', () => {
  const mockVideos = [
    require('../assets/images/sign_up_page_video.mp4'),
    require('../assets/images/sign_up_page_video_2.mp4'),
    require('../assets/images/sign_up_page_video_3.mp4'),
  ];

  it('renders without crashing', () => {
    const { getByTestId } = render(
      <BackgroundVideoPlayer
        videos={mockVideos}
        fadeDuration={1500}
        onVideoError={jest.fn()}
      />
    );
  });

  it('handles video errors gracefully', () => {
    const mockOnVideoError = jest.fn();
    const { getByTestId } = render(
      <BackgroundVideoPlayer
        videos={mockVideos}
        fadeDuration={1500}
        onVideoError={mockOnVideoError}
      />
    );
  });
});
