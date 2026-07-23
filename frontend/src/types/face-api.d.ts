declare module 'face-api.js' {
  export class TinyFaceDetectorOptions {
    constructor(options?: { inputSize?: number; scoreThreshold?: number });
  }

  export const nets: {
    tinyFaceDetector: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceExpressionNet: {
      loadFromUri(uri: string): Promise<void>;
    };
  };

  export function detectSingleFace(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    options?: TinyFaceDetectorOptions
  ): {
    withFaceExpressions(): Promise<{
      detections: unknown;
      expressions: {
        neutral: number;
        happy: number;
        sad: number;
        angry: number;
        fearful: number;
        disgusted: number;
        surprised: number;
      };
    } | undefined>;
  };
}
