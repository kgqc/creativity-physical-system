export interface GesturePoint {
  /** 归一化横坐标，建议范围 0–1。 */
  x: number;
  /** 归一化纵坐标，建议范围 0–1。 */
  y: number;
  /** 从动作录制开始计算的毫秒时间。 */
  t: number;
}

export interface HandGesture {
  pathPoints: GesturePoint[];
  speedProfile?: number[];
}

export interface GestureData {
  leftHand?: HandGesture;
  rightHand?: HandGesture;
  durationMs?: number;
}
