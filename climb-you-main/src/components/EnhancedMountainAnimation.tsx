import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, LayoutAnimation, Platform, UIManager, Animated, Easing } from 'react-native';
import Svg, { 
  Defs, 
  LinearGradient, 
  Stop, 
  Rect, 
  Circle, 
  Path, 
  G,
  Filter,
  FeDropShadow,
  Ellipse,
  Line
} from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 星の配列を事前計算（Hook外で実行）
const STARS = Array.from({ length: 120 }).map((_, i) => ({
  key: i,
  x: (i * 97 + 13) % 1200 - 200,
  y: (i * 53 + 7) % 400 - 150,
  r: i % 4 === 0 ? 1.8 : i % 3 === 0 ? 1.4 : 1,
}));

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

// 超高密度パス補間システム - 極限の滑らかさを実現
const generateHighDensityPath = (pathString: string, density: number = 5000): Array<{x: number, y: number, distance: number}> => {
  // ベジエ曲線の数学的計算で高密度ポイントを生成
  const points: Array<{x: number, y: number, distance: number}> = [];
  
  // パスを解析してベジエ曲線のコントロールポイントを取得
  const segments = [
    { start: {x: 80, y: 560}, cp1: {x: 120, y: 540}, cp2: {x: 160, y: 510}, end: {x: 220, y: 490} },
    { start: {x: 220, y: 490}, cp1: {x: 280, y: 470}, cp2: {x: 340, y: 440}, end: {x: 400, y: 410} },
    { start: {x: 400, y: 410}, cp1: {x: 460, y: 380}, cp2: {x: 520, y: 340}, end: {x: 580, y: 300} },
    { start: {x: 580, y: 300}, cp1: {x: 640, y: 260}, cp2: {x: 680, y: 220}, end: {x: 720, y: 180} },
    { start: {x: 720, y: 180}, cp1: {x: 750, y: 160}, cp2: {x: 770, y: 140}, end: {x: 780, y: 120} },
    { start: {x: 780, y: 120}, cp1: {x: 785, y: 115}, cp2: {x: 790, y: 110}, end: {x: 795, y: 105} },
  ];
  
  let totalDistance = 0;
  
  segments.forEach(segment => {
    const segmentPoints = Math.floor(density / segments.length);
    
    for (let i = 0; i <= segmentPoints; i++) {
      const t = i / segmentPoints;
      
      // より滑らかな補間のためのスプライン調整
      const smoothT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      
      // 超滑らか3次ベジエ曲線計算（スムーズT使用）
      const x = Math.pow(1-smoothT, 3) * segment.start.x +
                3 * Math.pow(1-smoothT, 2) * smoothT * segment.cp1.x +
                3 * (1-smoothT) * Math.pow(smoothT, 2) * segment.cp2.x +
                Math.pow(smoothT, 3) * segment.end.x;
      
      const y = Math.pow(1-smoothT, 3) * segment.start.y +
                3 * Math.pow(1-smoothT, 2) * smoothT * segment.cp1.y +
                3 * (1-smoothT) * Math.pow(smoothT, 2) * segment.cp2.y +
                Math.pow(smoothT, 3) * segment.end.y;
      
      // 前のポイントからの距離を計算
      if (points.length > 0) {
        const prev = points[points.length - 1];
        const dist = Math.sqrt(Math.pow(x - prev.x, 2) + Math.pow(y - prev.y, 2));
        totalDistance += dist;
      }
      
      points.push({ x, y, distance: totalDistance });
    }
  });
  
  return points;
};

// 高密度パスポイント（getPointAtLength相当）
const HIGH_DENSITY_PATH = generateHighDensityPath(TRAIL_PATH);
const TOTAL_PATH_LENGTH = HIGH_DENSITY_PATH[HIGH_DENSITY_PATH.length - 1].distance;

// getPointAtLength相当の関数
const getPointAtLength = (distance: number): {x: number, y: number} => {
  if (distance <= 0) return HIGH_DENSITY_PATH[0];
  if (distance >= TOTAL_PATH_LENGTH) return HIGH_DENSITY_PATH[HIGH_DENSITY_PATH.length - 1];
  
  // 二分探索で最適なポイントを見つける
  let left = 0;
  let right = HIGH_DENSITY_PATH.length - 1;
  
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (HIGH_DENSITY_PATH[mid].distance < distance) {
      left = mid;
    } else {
      right = mid;
    }
  }
  
  // 線形補間で正確な位置を計算
  const p1 = HIGH_DENSITY_PATH[left];
  const p2 = HIGH_DENSITY_PATH[right];
  const ratio = (distance - p1.distance) / (p2.distance - p1.distance);
  
  return {
    x: p1.x + (p2.x - p1.x) * ratio,
    y: p1.y + (p2.y - p1.y) * ratio
  };
};

// 境界条件を考慮した超滑らか角度計算
const calculateAngleWithBoundaryConditions = (targetDistance: number): number => {
  let angle: number;
  
  // より細かい距離でより滑らかな角度計算
  const lookAhead = 1.5; // 先読み距離を短縮
  const lookBehind = 1.5; // 後読み距離も短縮
  
  if (targetDistance < 2) {
    // 開始点近く：より細かい先読み
    const pt = getPointAtLength(targetDistance);
    const pt2 = getPointAtLength(Math.min(TOTAL_PATH_LENGTH, targetDistance + lookAhead));
    angle = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI;
  } else if (targetDistance > TOTAL_PATH_LENGTH - 2) {
    // 終点近く：より細かい後読み
    const pt = getPointAtLength(targetDistance);
    const prevPt = getPointAtLength(Math.max(0, targetDistance - lookBehind));
    angle = (Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x) * 180) / Math.PI;
  } else {
    // 通常：前後の点を使って平均化でより滑らか
    const pt = getPointAtLength(targetDistance);
    const ptForward = getPointAtLength(Math.min(TOTAL_PATH_LENGTH, targetDistance + lookAhead));
    const ptBackward = getPointAtLength(Math.max(0, targetDistance - lookBehind));
    
    // 前方と後方の角度を計算して平均化
    const forwardAngle = Math.atan2(ptForward.y - pt.y, ptForward.x - pt.x);
    const backwardAngle = Math.atan2(pt.y - ptBackward.y, pt.x - ptBackward.x);
    const averageAngle = (forwardAngle + backwardAngle) / 2;
    
    angle = (averageAngle * 180) / Math.PI;
  }
  
  return angle;
};

export default function EnhancedMountainAnimation({
  progress,
  onProgressChange,
  checkpoints = [0.2, 0.45, 0.7, 1],
}: EnhancedMountainAnimationProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Android用のLayoutAnimation有効化
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // アニメーション制御
  const zoomLevel = useRef(new Animated.Value(1)).current;
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(1);
  const [zoomCenter, setZoomCenter] = useState<{ x: number; y: number }>({ x: 400, y: 300 });
  const [lastProgress, setLastProgress] = useState<number>(0);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  
  // ハイカー移動用のアニメーションref（トップレベルで定義）
  const animationRef = useRef<number>();

  // パス関連（React Native用に簡略化）
  const [hikerPosition, setHikerPosition] = useState<HikerPosition>({ x: 80, y: 560, angle: 0 });
  
  // スムージング用の前回位置記録
  const [previousPosition, setPreviousPosition] = useState<HikerPosition>({ x: 80, y: 560, angle: 0 });
  
  // 位置スムージング関数（慣性効果付き）
  const smoothPosition = (newPos: HikerPosition, prevPos: HikerPosition, factor: number = 0.15): HikerPosition => {
    return {
      x: prevPos.x + (newPos.x - prevPos.x) * factor,
      y: prevPos.y + (newPos.y - prevPos.y) * factor,
      angle: prevPos.angle + (newPos.angle - prevPos.angle) * factor,
    };
  };

  useEffect(() => {
    setIsMounted(true);
    
    // zoomLevelの値変化を追跡
    const listener = zoomLevel.addListener(({ value }) => {
      setCurrentZoomLevel(value);
    });
    
    
    // クリーンアップ
    return () => {
      zoomLevel.removeListener(listener);
    };
  }, []);

  // 高精度ハイカー位置計算（参考元getPointAtLength相当）
  const calculateHikerPosition = useMemo(() => {
    return (progressValue: number) => {
      const targetDistance = progressValue * TOTAL_PATH_LENGTH;
      const pt = getPointAtLength(targetDistance);
      const angle = calculateAngleWithBoundaryConditions(targetDistance);
      
      return { x: pt.x, y: pt.y, angle };
    };
  }, []);

  // 進捗変化を検知（双方向対応：前進・後退両方でズーム）
  useEffect(() => {
    const progressDiff = Math.abs(progress - lastProgress);
    const isForward = progress > lastProgress;
    
    // DEBUG: Log significant progress changes only
    if (progressDiff >= 0.01) {
      console.log(`🔍 進捗変化検知 ${(progressDiff * 100).toFixed(1)}%:`, {
        前回: (lastProgress * 100).toFixed(1) + '%',
        現在: (progress * 100).toFixed(1) + '%',
        ズーム: progressDiff >= 0.01 ? '✅' : '❌'
      });
    }
    
    if (progressDiff >= 0.01) { // 1%の変化でズーム（テスト用に緩く）
      console.log(`🎬 ズーム開始 (${isForward ? '前進' : '後退'}):`, {
        前回: (lastProgress * 100).toFixed(0) + '%',
        現在: (progress * 100).toFixed(0) + '%',
        差分: (progressDiff * 100).toFixed(0) + '%'
      });
      
      // ズーム開始時は常に現在のハイカー位置を中心にする
      console.log('🎯 ズーム開始:', {
        現在ハイカー位置: { x: hikerPosition.x, y: hikerPosition.y },
        目標進捗: (progress * 100).toFixed(1) + '%',
        方向: isForward ? '前進' : '後退'
      });
      
      // ズーム中心は現在のハイカー位置（前進・後退問わず）
      setZoomCenter({ 
        x: hikerPosition.x, 
        y: hikerPosition.y 
      });
      
      // ステップ1: ズームイン開始
      setAnimationState('zooming-in');
      console.log(`🎬 ステップ1: ズームイン開始 (${isForward ? '前進' : '後退'})`);
      
      Animated.timing(zoomLevel, {
        toValue: 3,
        duration: 1200, // よりゆっくりと滑らかなズームイン
        easing: Easing.out(Easing.cubic), // easeOutCubic風でより自然
        useNativeDriver: false,
      }).start(() => {
        // 0.2秒の小休止後に移動許可
        setTimeout(() => {
          console.log(`🎬 ステップ2: 移動許可（0.2秒遅延後・${isForward ? '前進' : '後退'}）`);
          setAnimationState('moving');
        }, 200);
        
        // 短縮された待機時間でより反応の良いアニメーション
        setTimeout(() => {
          // ステップ3: ズームアウト開始
          console.log(`🎬 ステップ3: ズームアウト開始 (${isForward ? '前進' : '後退'})`);
          setAnimationState('zooming-out');
          
          Animated.timing(zoomLevel, {
            toValue: 1,
            duration: 1200, // ズームインと同じ時間で統一
            easing: Easing.out(Easing.cubic), // ズームインと同じeaseOutCubic風で統一感
            useNativeDriver: false,
          }).start(() => {
            console.log(`🎬 完了: 通常状態に戻る (${isForward ? '前進' : '後退'})`);
            setAnimationState('idle');
          });
        }, 2000 + 100); // 移動時間2秒 + 0.1秒後（より短い待機時間）
      });
    }
    setLastProgress(progress);
  }, [progress, lastProgress, hikerPosition.x, hikerPosition.y]);

  // 進捗→位置（完全分離制御）- 参考元完全移植
  useEffect(() => {
    // 移動が許可されている時のみ実行（'idle'時は常に移動可能、'moving'時のみズーム中の移動許可）
    if (animationState !== 'moving' && animationState !== 'idle') {
      console.log(`⏸️ 移動停止中 (状態: ${animationState})`);
      return;
    }
    
    const target = progress * TOTAL_PATH_LENGTH;

    if (!isMounted) {
      // 即座に位置更新（モーション削減時もスムージング適用）
      const pt = getPointAtLength(target);
      const angle = calculateAngleWithBoundaryConditions(target);
      const newPosition = { x: pt.x, y: pt.y, angle };
      
      // モーション削減時も最低限のスムージング
      const smoothed = smoothPosition(newPosition, hikerPosition, 0.7);
      setHikerPosition(smoothed);
      return;
    }

    // 現在のハイカーの実際の位置を開始点として使用（前進・後退に正確対応）
    const currentHikerDistance = (() => {
      // より高精度に現在のハイカー位置に最も近いパス上の距離を逆算
      let closestDistance = 0;
      let minDiff = Infinity;
      
      // 0.5刻みでより細かく検索
      for (let d = 0; d <= TOTAL_PATH_LENGTH; d += 0.5) {
        const testPoint = getPointAtLength(d);
        const diff = Math.sqrt(
          Math.pow(testPoint.x - hikerPosition.x, 2) + 
          Math.pow(testPoint.y - hikerPosition.y, 2)
        );
        if (diff < minDiff) {
          minDiff = diff;
          closestDistance = d;
        }
      }
      return closestDistance;
    })();
    
    console.log(`🏃 移動開始:`, {
      現在ハイカー距離: currentHikerDistance.toFixed(1),
      目標距離: target.toFixed(1),
      移動方向: target > currentHikerDistance ? '前進' : '後退',
      移動距離: Math.abs(target - currentHikerDistance).toFixed(1)
    });
    
    // 最高品質の滑らかな移動（現在位置から目標位置へ）
    const animationDuration = 2000; // 短縮された移動時間
    const startTime = Date.now();
    
    const animateMovement = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOut cubic
      
      // 現在の実際のハイカー位置から目標位置への補間
      const L = currentHikerDistance + (target - currentHikerDistance) * easedProgress;
      
      const rawPt = getPointAtLength(L);
      const rawAngle = calculateAngleWithBoundaryConditions(L);
      const rawPosition = { x: rawPt.x, y: rawPt.y, angle: rawAngle };
      
      // 3段階スムージング適用
      const smoothedOnce = smoothPosition(rawPosition, previousPosition, 0.3);
      const smoothedTwice = smoothPosition(smoothedOnce, hikerPosition, 0.5); 
      const finalPosition = smoothPosition(smoothedTwice, hikerPosition, 0.8);
      
      // 前回位置更新
      setPreviousPosition(hikerPosition);
      
      // requestAnimationFrameで最高の滑らかさ
      requestAnimationFrame(() => {
        setHikerPosition(finalPosition);
        
        // ズーム中はハイカーと一緒にズーム中心も移動
        if (currentZoomLevel > 1) {
          setZoomCenter({ x: finalPosition.x, y: finalPosition.y });
        }
      });
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateMovement);
      } else {
        // アニメーション完了時にlastProgressを更新
        console.log(`✅ 移動完了: ${target.toFixed(1)} → 進捗更新`);
      }
    };
    
    animateMovement();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [progress, TOTAL_PATH_LENGTH, animationState, isMounted]); // lastProgressを依存関係から除去

  // 視差効果の計算（最適化）
  const parallax = useMemo(() => {
    return (depth: number) => ({
      transform: [{ translateX: -(currentZoomLevel - 1) * depth }],
    });
  }, [currentZoomLevel]);

  // チェックポイントの位置計算（最適化）
  const checkpointPositions = useMemo(() => {
    return checkpoints.map(p => {
      const pos = calculateHikerPosition(p);
      return { ...pos, progress: p };
    });
  }, [checkpoints, calculateHikerPosition]);

  const reachedCheckpoints = checkpointPositions.filter(cp => progress >= cp.progress - 0.001).map(cp => cp.progress);

  // 早期リターンを削除し、条件レンダリングに変更

  return (
    <View style={styles.container}>
      {isMounted && (
        <Svg
          width="100%"
          height="100%"
          viewBox={(() => {
            if (currentZoomLevel > 1) {
              // ズーム中は常に現在のハイカー位置を中心にする（移動先ではなく）
              const viewWidth = 800 / currentZoomLevel;
              const viewHeight = 600 / currentZoomLevel;
              
              // 現在のハイカー位置を中心にする
              const currentHikerX = hikerPosition.x;
              const currentHikerY = hikerPosition.y;
              
              const centerX = currentHikerX - viewWidth / 2;
              const centerY = currentHikerY - viewHeight / 2;
              
              console.log('📹 ViewBox計算 (ハイカー追従):', {
                ズームレベル: currentZoomLevel,
                現在のハイカー位置: { x: currentHikerX, y: currentHikerY },
                ビューサイズ: { w: viewWidth, h: viewHeight },
                ViewBox: `${centerX.toFixed(1)} ${centerY.toFixed(1)} ${viewWidth.toFixed(1)} ${viewHeight.toFixed(1)}`
              });
              
              return `${centerX} ${centerY} ${viewWidth} ${viewHeight}`;
            } else {
              // 通常時は全体表示
              return "0 0 800 600";
            }
          })()}
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
        {STARS.map((star) => (
          <Circle
            key={star.key}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="#cfe7ff"
            opacity="0.6"
          />
        ))}
        
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
          {/* 参考元 hiker.svg の完全移植 (60x72 viewBox="0 0 60 72") */}
          <G transform="translate(0, -36)">
            {/* Head with more realistic proportions */}
            <Ellipse cx="1" cy="-28" rx="5.5" ry="6.5" fill="#2d5a7b"/>
            
            {/* Hat/Cap with bill */}
            <Ellipse cx="1" cy="-30" rx="7" ry="4" fill="#1e3a5f"/>
            <Ellipse cx="4" cy="-30" rx="3" ry="2" fill="#1e3a5f"/>
            
            {/* Large backpack (more prominent like reference) */}
            <Path d="M-12,-22 Q-15,-26 -12,-30 Q-8,-32 -4,-30 Q-2,-28 -2,-20 Q-2,-8 -4,-4 Q-8,-2 -12,-4 Q-15,-8 -12,-22 Z" fill="#2d5a7b"/>
            <Rect x="-11" y="-25" width="2" height="8" fill="#1e3a5f"/>
            <Circle cx="-8" cy="-24" r="1" fill="#1e3a5f"/>
            
            {/* Body/Torso (more athletic build) */}
            <Path d="M-8,-18 Q-10,-12 -8,-6 Q-6,-2 0,0 Q6,-2 8,-6 Q10,-12 8,-18 Q4,-20 -4,-20 Q-8,-20 -8,-18 Z" fill="#2d5a7b"/>
            
            {/* Left arm reaching forward with hiking pole */}
            <Path d="M-8,-14 Q-14,-10 -16,-4 Q-18,2 -16,8 Q-14,12 -12,14" stroke="#2d5a7b" strokeWidth="5" fill="none" strokeLinecap="round"/>
            
            {/* Right arm swinging */}
            <Path d="M8,-14 Q12,-10 14,-4 Q15,2 12,8 Q10,12 8,14" stroke="#2d5a7b" strokeWidth="5" fill="none" strokeLinecap="round"/>
            
            {/* Hiking stick (more prominent) */}
            <Line x1="-17" y1="16" x2="-14" y2="-8" stroke="#8b4513" strokeWidth="2" strokeLinecap="round"/>
            <Circle cx="-14.5" cy="-6" r="1.5" fill="#4a4a4a"/>
            
            {/* Left leg (stepping forward, bent knee) */}
            <Path d="M-4,2 Q-8,8 -10,16 Q-12,24 -8,30 Q-6,32 -4,30" stroke="#2d5a7b" strokeWidth="6" fill="none" strokeLinecap="round"/>
            
            {/* Right leg (pushing off, more extended) */}
            <Path d="M4,2 Q8,10 10,18 Q12,26 8,32 Q6,34 4,32" stroke="#2d5a7b" strokeWidth="6" fill="none" strokeLinecap="round"/>
            
            {/* Boots (more realistic) */}
            <Ellipse cx="-6" cy="32" rx="4" ry="2.5" fill="#1e3a5f"/>
            <Ellipse cx="6" cy="34" rx="4" ry="2.5" fill="#1e3a5f"/>
            
            {/* Backpack straps */}
            <Path d="M-4,-18 Q-2,-16 0,-18 Q2,-16 4,-18" stroke="#1e3a5f" strokeWidth="2" fill="none"/>
            <Line x1="-2" y1="-18" x2="-1" y2="-8" stroke="#1e3a5f" strokeWidth="2"/>
            <Line x1="2" y1="-18" x2="1" y2="-8" stroke="#1e3a5f" strokeWidth="2"/>
            
            {/* Belt/waist pack */}
            <Ellipse cx="0" cy="-4" rx="10" ry="2" fill="#1e3a5f"/>
          </G>
        </G>
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2947',
  },
});