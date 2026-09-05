export type FaceAnalysis = {
  faceCount: number;
  hasSingleFace: boolean;
  captureQuality: number | null;
  yaw: number | null;
  roll: number | null;
  pitch: number | null;
  centerX: number | null;
  centerY: number | null;
  width: number | null;
  height: number | null;
};
