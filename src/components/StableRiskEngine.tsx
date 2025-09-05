import { useState, useEffect, useCallback } from "react";

export interface RiskEvidence {
  id: string;
  type: "fall" | "crash" | "distress_audio" | "low_spo2" | "abnormal_hr" | "stillness" | "stress" | "environmental";
  severity: number; // 0-100
  confidence: number; // 0-1
  timestamp: Date;
  duration: number; // seconds
  description: string;
  rawData?: any;
}

export interface RiskState {
  currentScore: number; // 0-100
  level: "safe" | "elevated" | "high" | "critical";
  trend: "stable" | "rising" | "falling";
  lastUpdate: Date;
  confidence: number;
  activeEvidence: RiskEvidence[];
  timeline: Array<{ timestamp: Date; score: number; level: string; evidence: string[] }>;
}

export interface RiskThresholds {
  elevated: { enter: number; exit: number; sustainTime: number }; // 40/35, 6s
  high: { enter: number; exit: number; sustainTime: number };     // 60/50, 6s  
  critical: { enter: number; exit: number; sustainTime: number }; // 80/70, 4s
}

export class StableRiskEngine {
  private evidence: RiskEvidence[] = [];
  private scoreHistory: Array<{ timestamp: Date; score: number; rawScore: number }> = [];
  private levelHistory: Array<{ level: string; enterTime: Date; exitTime?: Date }> = [];
  private currentLevel: "safe" | "elevated" | "high" | "critical" = "safe";
  private lastBaseScore = 0;
  private decayRate = 0.05; // per second
  
  private thresholds: RiskThresholds = {
    elevated: { enter: 40, exit: 35, sustainTime: 6 },
    high: { enter: 60, exit: 50, sustainTime: 6 },
    critical: { enter: 80, exit: 70, sustainTime: 4 }
  };
  
  private evidenceWeights = {
    fall: 40,
    crash: 45,
    distress_audio: 35,
    low_spo2: 30,
    abnormal_hr: 25,
    stillness: 15,
    stress: 20,
    environmental: 25
  };
  
  private debounceTimers = new Map<string, number>();
  private sustainTimers = new Map<string, { enterTime: Date; threshold: number }>();
  
  addEvidence(evidence: Omit<RiskEvidence, "id" | "timestamp">): void {
    const id = `${evidence.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullEvidence: RiskEvidence = {
      ...evidence,
      id,
      timestamp: new Date()
    };
    
    // Debounce similar evidence types
    const debounceKey = `${evidence.type}-${evidence.severity}`;
    const existingTimer = this.debounceTimers.get(debounceKey);
    
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Apply debounce (3-6 seconds based on severity)
    const debounceTime = evidence.severity > 70 ? 3000 : 
                        evidence.severity > 40 ? 4000 : 6000;
    
    const timer = window.setTimeout(() => {
      this.evidence.push(fullEvidence);
      this.debounceTimers.delete(debounceKey);
      console.log(`Risk evidence added: ${evidence.type} (${evidence.severity}% severity, ${evidence.confidence * 100}% confidence)`);
    }, debounceTime);
    
    this.debounceTimers.set(debounceKey, timer);
  }
  
  calculateRiskScore(): RiskState {
    const now = new Date();
    
    // Clean up expired evidence (older than 5 minutes)
    this.evidence = this.evidence.filter(e => 
      (now.getTime() - e.timestamp.getTime()) < 300000
    );
    
    // Calculate time-decayed base score
    const timeDelta = this.scoreHistory.length > 0 ? 
      (now.getTime() - this.scoreHistory[this.scoreHistory.length - 1].timestamp.getTime()) / 1000 : 0;
    
    const decayedBase = this.lastBaseScore * Math.exp(-this.decayRate * timeDelta);
    
    // Calculate weighted evidence sum
    let evidenceSum = 0;
    const activeEvidence: RiskEvidence[] = [];
    
    for (const evidence of this.evidence) {
      const age = (now.getTime() - evidence.timestamp.getTime()) / 1000; // seconds
      const weight = this.evidenceWeights[evidence.type] || 10;
      
      // Apply time decay to evidence (half-life of 2 minutes)
      const timeDecay = Math.exp(-age / 120);
      const effectiveScore = evidence.severity * evidence.confidence * weight * timeDecay / 100;
      
      evidenceSum += effectiveScore;
      
      if (effectiveScore > 5) { // Only include significant evidence
        activeEvidence.push(evidence);
      }
    }
    
    // Calculate raw score with hysteresis protection
    const rawScore = Math.max(0, Math.min(100, decayedBase + evidenceSum));
    
    // Apply hysteresis for level changes
    const newLevel = this.calculateLevelWithHysteresis(rawScore, now);
    
    // Smooth final score (prevent rapid oscillations)
    const smoothedScore = this.applySmoothingFilter(rawScore);
    
    // Update history
    this.scoreHistory.push({ timestamp: now, score: smoothedScore, rawScore });
    if (this.scoreHistory.length > 300) { // Keep 5 minutes of history (1 per second)
      this.scoreHistory = this.scoreHistory.slice(-300);
    }
    
    this.lastBaseScore = smoothedScore;
    
    // Calculate trend
    const trend = this.calculateTrend();
    
    // Calculate confidence
    const confidence = this.calculateConfidence(activeEvidence);
    
    // Update timeline
    const timeline = this.generateTimeline();
    
    console.log(`Risk Engine Update: Score=${smoothedScore.toFixed(1)}, Level=${newLevel}, Trend=${trend}, Evidence=${activeEvidence.length}`);
    
    return {
      currentScore: Math.round(smoothedScore * 10) / 10,
      level: newLevel,
      trend,
      lastUpdate: now,
      confidence,
      activeEvidence,
      timeline
    };
  }
  
  private calculateLevelWithHysteresis(score: number, now: Date): "safe" | "elevated" | "high" | "critical" {
    // Check for level escalation (require sustained threshold crossing)
    for (const [levelName, threshold] of Object.entries(this.thresholds)) {
      const level = levelName as keyof RiskThresholds;
      
      if (score >= threshold.enter && this.isLevelBelow(this.currentLevel, level)) {
        const sustainKey = `enter-${level}`;
        
        if (!this.sustainTimers.has(sustainKey)) {
          this.sustainTimers.set(sustainKey, { enterTime: now, threshold: threshold.enter });
          console.log(`Risk escalation timer started: ${level} (${threshold.sustainTime}s required)`);
        } else {
          const timer = this.sustainTimers.get(sustainKey)!;
          const sustainedTime = (now.getTime() - timer.enterTime.getTime()) / 1000;
          
          if (sustainedTime >= threshold.sustainTime) {
            this.currentLevel = level;
            this.sustainTimers.delete(sustainKey);
            this.addLevelChange(level, now);
            console.log(`Risk level escalated to: ${level}`);
            break;
          }
        }
      } else {
        // Cancel escalation timer if score drops
        this.sustainTimers.delete(`enter-${level}`);
      }
    }
    
    // Check for level de-escalation (require sustained threshold crossing)
    for (const [levelName, threshold] of Object.entries(this.thresholds)) {
      const level = levelName as keyof RiskThresholds;
      
      if (score <= threshold.exit && this.currentLevel === level) {
        const sustainKey = `exit-${level}`;
        
        if (!this.sustainTimers.has(sustainKey)) {
          this.sustainTimers.set(sustainKey, { enterTime: now, threshold: threshold.exit });
          console.log(`Risk de-escalation timer started: ${level} -> safe`);
        } else {
          const timer = this.sustainTimers.get(sustainKey)!;
          const sustainedTime = (now.getTime() - timer.enterTime.getTime()) / 1000;
          
          if (sustainedTime >= threshold.sustainTime) {
            const newLevel = this.getLowerLevel(level);
            this.currentLevel = newLevel;
            this.sustainTimers.delete(sustainKey);
            this.addLevelChange(newLevel, now);
            console.log(`Risk level de-escalated to: ${newLevel}`);
            break;
          }
        }
      } else {
        // Cancel de-escalation timer if score rises
        this.sustainTimers.delete(`exit-${level}`);
      }
    }
    
    return this.currentLevel;
  }
  
  private isLevelBelow(current: string, target: string): boolean {
    const levels = ["safe", "elevated", "high", "critical"];
    return levels.indexOf(current) < levels.indexOf(target);
  }
  
  private getLowerLevel(current: string): "safe" | "elevated" | "high" | "critical" {
    switch (current) {
      case "critical": return "high";
      case "high": return "elevated";
      case "elevated": return "safe";
      default: return "safe";
    }
  }
  
  private addLevelChange(level: string, time: Date): void {
    // Close previous level
    if (this.levelHistory.length > 0) {
      const last = this.levelHistory[this.levelHistory.length - 1];
      if (!last.exitTime) {
        last.exitTime = time;
      }
    }
    
    // Add new level
    this.levelHistory.push({ level, enterTime: time });
  }
  
  private applySmoothingFilter(rawScore: number): number {
    const historyLength = Math.min(this.scoreHistory.length, 5);
    if (historyLength === 0) return rawScore;
    
    // Exponential moving average
    const weights = [0.4, 0.3, 0.2, 0.1]; // Current, -1, -2, -3 seconds
    let weightedSum = rawScore * weights[0];
    let totalWeight = weights[0];
    
    for (let i = 1; i < Math.min(historyLength, weights.length); i++) {
      const historyScore = this.scoreHistory[this.scoreHistory.length - i].score;
      weightedSum += historyScore * weights[i];
      totalWeight += weights[i];
    }
    
    return weightedSum / totalWeight;
  }
  
  private calculateTrend(): "stable" | "rising" | "falling" {
    if (this.scoreHistory.length < 10) return "stable";
    
    const recent = this.scoreHistory.slice(-10);
    const early = recent.slice(0, 5);
    const late = recent.slice(5, 10);
    
    const earlyAvg = early.reduce((sum, h) => sum + h.score, 0) / early.length;
    const lateAvg = late.reduce((sum, h) => sum + h.score, 0) / late.length;
    
    const change = lateAvg - earlyAvg;
    
    if (Math.abs(change) < 2) return "stable";
    return change > 0 ? "rising" : "falling";
  }
  
  private calculateConfidence(activeEvidence: RiskEvidence[]): number {
    if (activeEvidence.length === 0) return 0.95;
    
    const avgConfidence = activeEvidence.reduce((sum, e) => sum + e.confidence, 0) / activeEvidence.length;
    const evidenceConsistency = activeEvidence.length > 1 ? 0.9 : 0.8;
    
    return Math.min(0.99, avgConfidence * evidenceConsistency);
  }
  
  private generateTimeline(): Array<{ timestamp: Date; score: number; level: string; evidence: string[] }> {
    const timeline = [];
    const recentHistory = this.scoreHistory.slice(-60); // Last minute
    
    for (let i = 0; i < recentHistory.length; i += 5) { // Every 5 seconds
      const entry = recentHistory[i];
      const relevantEvidence = this.evidence
        .filter(e => Math.abs(e.timestamp.getTime() - entry.timestamp.getTime()) < 2000)
        .map(e => e.description);
      
      timeline.push({
        timestamp: entry.timestamp,
        score: entry.score,
        level: this.getScoreLevel(entry.score),
        evidence: relevantEvidence
      });
    }
    
    return timeline.slice(-12); // Last minute in 5-second intervals
  }
  
  private getScoreLevel(score: number): string {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "elevated";
    return "safe";
  }
  
  getDiagnostics() {
    return {
      evidenceCount: this.evidence.length,
      scoreHistory: this.scoreHistory.slice(-20),
      levelHistory: this.levelHistory.slice(-5),
      activeTimers: Array.from(this.sustainTimers.keys()),
      thresholds: this.thresholds,
      weights: this.evidenceWeights,
      decayRate: this.decayRate
    };
  }
  
  reset(): void {
    this.evidence = [];
    this.scoreHistory = [];
    this.levelHistory = [];
    this.currentLevel = "safe";
    this.lastBaseScore = 0;
    this.sustainTimers.clear();
    this.debounceTimers.clear();
    console.log("Risk Engine reset");
  }
}

export const useStableRiskEngine = () => {
  const [engine] = useState(() => new StableRiskEngine());
  const [riskState, setRiskState] = useState<RiskState>({
    currentScore: 0,
    level: "safe",
    trend: "stable",
    lastUpdate: new Date(),
    confidence: 0.95,
    activeEvidence: [],
    timeline: []
  });
  
  const updateRisk = useCallback(() => {
    const newState = engine.calculateRiskScore();
    setRiskState(newState);
    return newState;
  }, [engine]);
  
  const addEvidence = useCallback((evidence: Omit<RiskEvidence, "id" | "timestamp">) => {
    engine.addEvidence(evidence);
    // Update immediately for critical evidence
    if (evidence.severity > 70) {
      updateRisk();
    }
  }, [engine, updateRisk]);
  
  const getDiagnostics = useCallback(() => {
    return engine.getDiagnostics();
  }, [engine]);
  
  const reset = useCallback(() => {
    engine.reset();
    setRiskState({
      currentScore: 0,
      level: "safe",
      trend: "stable",
      lastUpdate: new Date(),
      confidence: 0.95,
      activeEvidence: [],
      timeline: []
    });
  }, [engine]);
  
  // Auto-update every second
  useEffect(() => {
    const interval = setInterval(updateRisk, 1000);
    return () => clearInterval(interval);
  }, [updateRisk]);
  
  return {
    riskState,
    addEvidence,
    updateRisk,
    getDiagnostics,
    reset,
    engine
  };
};