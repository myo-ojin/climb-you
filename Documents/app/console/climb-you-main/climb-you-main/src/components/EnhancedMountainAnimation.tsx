import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { animate, useReducedMotion } from 'framer-motion';
import Svg, { 
  Defs, 
  LinearGradient, 
  Stop, 
  Rect, 
  Circle, 
  Path, 
  G,
  Filter,
  FeDropShadow
} from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface EnhancedMountainAnimationProps {
  /** 進捗値 (0-1の範囲) */
  progress: number;
  /** 進捗変更時のコールバック（オプション） */
  onProgressChange?: (progress: number) => void;
  /** チェックポイントの配列 (0-1の範囲) */
  checkpoints?: number[];
}

interface HikerPosition {
  x: number;
  y: number; 
  angle: number;
}

type AnimationState = 'idle' | 'zooming-in' | 'moving' | 'zooming-out';

// ★道の形を山の輪郭に沿うように変更
const TRAIL_PATH = 'M80,560 C 120,540 160,510 220,490 C 280,470 340,440 400,410 C 460,380 520,340 580,300 C 640,260 680,220 720,180 C 750,160 770,140 780,120 C 785,115 790,110 795,105';

export default function EnhancedMountainAnimation({
  progress,
  onProgressChange,
  checkpoints = [0.2, 0.45, 0.7, 1],
}: EnhancedMountainAnimationProps) {
  const [isMounted, setIsMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // アニメーション制御
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomCenter, setZoomCenter] = useState<{ x: number; y: number }>({ x: 400, y: 300 });
  const [lastProgress, setLastProgress] = useState<number>(0);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');

  // パス関連（React Native用に簡略化）
  const [hikerPosition, setHikerPosition] = useState<HikerPosition>({ x: 80, y: 560, angle: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 進捗からハイカーの位置を計算（最適化版・メモ化）
  const calculateHikerPosition = useMemo(() => {
    const pathPoints = [
      { x: 80, y: 560 },
      { x: 220, y: 490 },
      { x: 400, y: 410 },
      { x: 580, y: 300 },
      { x: 720, y: 180 },
      { x: 795, y: 105 },
    ];
    
    return (progressValue: number) => {
      const segmentIndex = Math.min(Math.floor(progressValue * (pathPoints.length - 1)), pathPoints.length - 2);
      const segmentProgress = (progressValue * (pathPoints.length - 1)) - segmentIndex;
      
      const start = pathPoints[segmentIndex];
      const end = pathPoints[segmentIndex + 1];
      
      const x = start.x + (end.x - start.x) * segmentProgress;
      const y = start.y + (end.y - start.y) * segmentProgress;
      
      // 角度計算（次のポイントへの方向）
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      return { x, y, angle };
    };
  }, []);

  // 進捗変化を検知（ズームトリガー用）
  useEffect(() => {
    if (!prefersReducedMotion && progress > lastProgress && progress - lastProgress >= 0.05) {
      const newPosition = calculateHikerPosition(progress);
      
      // ズーム中心をハイカーの位置に設定
      setZoomCenter({
        x: newPosition.x,
        y: newPosition.y
      });
      
      // 3段階アニメーション開始
      setAnimationState('zooming-in');
      console.log('🎬 ステップ1: ズームイン開始');
      
      animate(zoomLevel, 3, {
        duration: 0.7,
        ease: [0.2, 0, 0.3, 1],
        onUpdate: setZoomLevel,
        onComplete: () => {
          // 0.2秒の小休止後に移動許可
          setTimeout(() => {
            console.log('🎬 ステップ2: 移動許可（0.2秒遅延後）');
            setAnimationState('moving');
            setHikerPosition(newPosition);
          }, 200);
          
          // 移動完了を待つ
          setTimeout(() => {
            console.log('🎬 ステップ3: ズームアウト開始');
            setAnimationState('zooming-out');
            
            animate(zoomLevel, 1, {
              duration: 1.1,
              ease: [0.4, 0, 0.2, 1],
              onUpdate: setZoomLevel,
              onComplete: () => {
                console.log('🎬 完了: 通常状態に戻る');
                setAnimationState('idle');
              }
            });
          }, 1200);
        }
      });
    } else {
      // 通常の進捗更新（ズームなし）
      setHikerPosition(calculateHikerPosition(progress));
    }
    setLastProgress(progress);
  }, [progress, lastProgress, prefersReducedMotion]);

  // 視差効果の計算（最適化）
  const parallax = useMemo(() => {
    return (depth: number) => ({
      transform: [{ translateX: -(zoomLevel - 1) * depth }],
    });
  }, [zoomLevel]);

  // チェックポイントの位置計算（最適化）
  const checkpointPositions = useMemo(() => {
    return checkpoints.map(p => {
      const pos = calculateHikerPosition(p);
      return { ...pos, progress: p };
    });
  }, [checkpoints, calculateHikerPosition]);

  const reachedCheckpoints = checkpointPositions.filter(cp => progress >= cp.progress - 0.001).map(cp => cp.progress);

  if (!isMounted) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Svg
        width="100%"
        height="100%"
        viewBox={zoomLevel > 1 ? "-200 -150 1200 900" : "0 0 800 600"}
        style={{
          transform: [
            { scale: zoomLevel },
          ],
        }}
      >
        {/* ====== Defs ====== */}
        <Defs>
          {/* 空のグラデーション */}
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0f2947" />
            <Stop offset="100%" stopColor="#081b30" />
          </LinearGradient>
          {/* 地表の霧 */}
          <LinearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(12,28,48,0)" />
            <Stop offset="100%" stopColor="rgba(12,28,48,0.55)" />
          </LinearGradient>
          {/* 影のフィルター */}
          <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <FeDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000" floodOpacity="0.45" />
          </Filter>
        </Defs>

        {/* ====== 背景 ====== */}
        <Rect x="-200" y="-150" width="1200" height="900" fill="url(#sky)" />
        
        {/* 星（静的配置・最適化） */}
        {useMemo(() => 
          Array.from({ length: 120 }).map((_, i) => {
            const x = (i * 97 + 13) % 1200 - 200;
            const y = (i * 53 + 7) % 400 - 150;
            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r={i % 4 === 0 ? 1.8 : i % 3 === 0 ? 1.4 : 1}
                fill="#cfe7ff"
                opacity="0.6"
              />
            );
          }), []
        )}
        
        {/* 月 */}
        <Circle cx="150" cy="80" r="35" fill="#ffe7aa" />

        {/* 背景の山（遠→近） */}
        <G style={parallax(8)}>
          <Path d="M-200,420 C-80,380 40,370 180,380 C320,390 440,350 600,300 C760,350 920,380 1000,300 L1000,750 L-200,750 Z" fill="#4a6b85" opacity="0.7" />
          <Path d="M20,390 L100,300 L160,390 Z" fill="#4a6b85" opacity="0.75" />
          <Path d="M320,400 L390,310 L460,400 Z" fill="#4a6b85" opacity="0.72" />
          <Path d="M720,400 L790,310 L860,400 Z" fill="#4a6b85" opacity="0.72" />
        </G>
        
        <G style={parallax(22)}>
          <Path d="M-200,480 C-40,440 100,430 270,420 C420,410 520,370 600,340 C720,370 880,440 1000,340 L1000,750 L-200,750 Z" fill="#5a7b95" />
        </G>
        
        <G style={parallax(38)}>
          <Path d="M-200,540 C-20,510 140,505 320,495 C470,485 540,460 600,445 C720,460 880,510 1000,445 L1000,750 L-200,750 Z" fill="#6a8ba5" />
        </G>
        
        <Rect x="-200" y="480" width="1200" height="270" fill="url(#haze)" />

        {/* ====== ベースの道 ====== */}
        <Path d={TRAIL_PATH} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="8" strokeLinecap="round" />

        {/* ====== 前景の山 ====== */}
        <G>
          {/* 道の下側の山々 */}
          <Path d="M-200,750 L-120,730 L-40,680 L40,660 L120,630 L200,600 L280,570 L360,530 L440,490 L520,350 L600,300 L680,250 L720,200 L800,150 L880,200 L960,300 L1000,400 L1000,750 Z" fill="#2d5a7b" />
          
          {/* 道の上側の山々 */}
          <Path d="M-200,650 L-100,630 L0,600 L100,580 L200,550 L300,520 L400,490 L500,460 L600,420 L700,380 L760,210 L800,210 L840,250 L920,350 L1000,650 L920,450 L840,350 L800,320 L760,320 L700,420 L600,450 L500,480 L400,510 L300,540 L200,570 L100,600 L0,630 L-100,650 Z" fill="#3a6b8c" />
          
          {/* 主峰 */}
          <Path d="M700,750 L750,300 L760,210 L780,200 L800,220 L820,250 L850,300 L900,400 L950,500 L1000,750 Z" fill="#4a7ba0" />
          
          {/* 道沿いの岩場 */}
          <Path d="M150,750 L180,670 L220,650 L250,670 L280,750 Z" fill="#1e3a5f" />
          <Path d="M450,750 L480,580 L520,560 L550,580 L580,750 Z" fill="#1e3a5f" />
          <Path d="M-150,750 L-120,680 L-80,660 L-50,680 L-20,750 Z" fill="#1e3a5f" />
          <Path d="M850,750 L880,580 L920,560 L950,580 L980,750 Z" fill="#1e3a5f" />
        </G>

        {/* ====== チェックポイント ====== */}
        {checkpointPositions.map((cp) => (
          <G key={cp.progress} transform={`translate(${cp.x}, ${cp.y})`}>
            <Circle
              r="3"
              fill={reachedCheckpoints.includes(cp.progress) ? "#4CAF50" : "#ffffff"}
              opacity="0.95"
            />
          </G>
        ))}

        {/* ====== ハイカー（最前面） ====== */}
        <G 
          transform={`translate(${hikerPosition.x}, ${hikerPosition.y}) rotate(${hikerPosition.angle})`}
          filter="url(#shadow)"
        >
          {/* シンプルなハイカーシルエット */}
          <Circle cx="0" cy="-30" r="8" fill="#FF4444" />
          <Rect x="-6" y="-22" width="12" height="20" rx="6" fill="#FF4444" />
          <Circle cx="0" cy="-35" r="5" fill="#FFDBAC" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2947',
  },
});