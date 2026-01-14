// Sound effects hook for lesson and quiz interactions
const sounds = {
  lessonComplete: '/sounds/lesson-complete.mp3',
  lessonTransition: '/sounds/lesson-transition.mp3',
  quizSuccess: '/sounds/quiz-success.mp3',
  quizFail: '/sounds/quiz-fail.mp3',
};

export type SoundType = keyof typeof sounds;

export function useSoundEffects() {
  const playSound = (soundType: SoundType) => {
    try {
      const audio = new Audio(sounds[soundType]);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors (e.g., autoplay blocked by browser)
      });
    } catch {
      // Ignore any errors
    }
  };

  return { playSound };
}
