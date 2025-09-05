import { useState, useEffect, useCallback } from "react";

interface VitalReading {
  heartRate: number;
  spO2: number;
  temperature: number;
  timestamp: Date;
  source: "sensor" | "camera" | "manual" | "simulated";
}

interface RiskFactor {
  id: string;
  type: "vital" | "environmental" | "behavioral" | "sensor";
  severity: number; // 0-10
  confidence: number; // 0-1
  timestamp: Date;
  description: string;
  evidence: any;
}

interface RiskScoreState {
  current: number;
  trend: "stable" | "rising" | "falling";
  factors: RiskFactor[];
  lastUpdate: Date;
  confidence: number;
}

export class RiskScoreEngine {
  private weightDecayRate = 0.1; // λ in exponential decay
  private smoothingWindow = 5; // Number of readings to smooth
  private readonly thresholds = {
    heartRate: { low: 50, high: 120, critical: { low: 40, high: 140 } },
    spO2: { low: 90, critical: 85 },
    temperature: { low: 35.5, high: 38.5, critical: { low: 34, high: 40 } }
  };

  private riskHistory: number[] = [];
  private vitalHistory: VitalReading[] = [];
  private environmentalFactors: Map<string, RiskFactor> = new Map();
  
  constructor() {}

  // Weighted accumulator with time decay
  calculateRiskScore(vitals: VitalReading, environmentalData?: any): RiskScoreState {
    const now = new Date();
    let baseScore = 0;
    const factors: RiskFactor[] = [];

    // Add current vitals to history with smoothing
    this.vitalHistory = [...this.vitalHistory.slice(-this.smoothingWindow), vitals];
    
    // Smooth vital readings
    const smoothedVitals = this.smoothVitals();

    // Heart Rate Risk Assessment
    const hrRisk = this.assessHeartRateRisk(smoothedVitals.heartRate, vitals.source);
    if (hrRisk.severity > 0) {
      factors.push(hrRisk);
      baseScore += hrRisk.severity * hrRisk.confidence;
    }

    // SpO2 Risk Assessment
    const spO2Risk = this.assessSpO2Risk(smoothedVitals.spO2, vitals.source);
    if (spO2Risk.severity > 0) {
      factors.push(spO2Risk);
      baseScore += spO2Risk.severity * spO2Risk.confidence;
    }

    // Temperature Risk Assessment
    const tempRisk = this.assessTemperatureRisk(smoothedVitals.temperature, vitals.source);
    if (tempRisk.severity > 0) {
      factors.push(tempRisk);
      baseScore += tempRisk.severity * tempRisk.confidence;
    }

    // Environmental factors decay
    this.updateEnvironmentalFactors(now);
    
    // Add environmental risk
    for (const [_, factor] of this.environmentalFactors) {
      factors.push(factor);
      baseScore += factor.severity * factor.confidence;
    }

    // Apply time decay to historical scores
    const timeDecayedScore = this.applyTimeDecay(baseScore, now);
    
    // Clamp final score
    const finalScore = Math.max(0, Math.min(10, timeDecayedScore));
    
    // Update history
    this.riskHistory = [...this.riskHistory.slice(-20), finalScore];
    
    // Calculate trend
    const trend = this.calculateTrend();
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(factors, vitals.source);

    return {
      current: Math.round(finalScore * 10) / 10,
      trend,
      factors,
      lastUpdate: now,
      confidence
    };
  }

  private smoothVitals(): VitalReading {
    if (this.vitalHistory.length === 0) {
      return { heartRate: 70, spO2: 98, temperature: 36.8, timestamp: new Date(), source: "simulated" };
    }

    const weights = this.vitalHistory.map((_, i) => Math.pow(0.8, this.vitalHistory.length - 1 - i));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const smoothed = this.vitalHistory.reduce((acc, reading, i) => {
      const weight = weights[i] / totalWeight;
      return {
        heartRate: acc.heartRate + reading.heartRate * weight,
        spO2: acc.spO2 + reading.spO2 * weight,
        temperature: acc.temperature + reading.temperature * weight
      };
    }, { heartRate: 0, spO2: 0, temperature: 0 });

    const latest = this.vitalHistory[this.vitalHistory.length - 1];
    return {
      ...smoothed,
      timestamp: latest.timestamp,
      source: latest.source
    };
  }

  private assessHeartRateRisk(heartRate: number, source: string): RiskFactor {
    let severity = 0;
    let description = "Heart rate normal";
    let confidence = source === "camera" ? 0.87 : source === "sensor" ? 0.95 : 0.7;

    if (heartRate < this.thresholds.heartRate.critical.low || heartRate > this.thresholds.heartRate.critical.high) {
      severity = 8;
      description = `Critical heart rate: ${heartRate.toFixed(0)} BPM`;
    } else if (heartRate < this.thresholds.heartRate.low || heartRate > this.thresholds.heartRate.high) {
      severity = 4;
      description = `Abnormal heart rate: ${heartRate.toFixed(0)} BPM`;
    } else if (heartRate < 60 || heartRate > 100) {
      severity = 2;
      description = `Borderline heart rate: ${heartRate.toFixed(0)} BPM`;
    }

    return {
      id: `hr-${Date.now()}`,
      type: "vital",
      severity,
      confidence,
      timestamp: new Date(),
      description,
      evidence: { heartRate, source, threshold: this.thresholds.heartRate }
    };
  }

  private assessSpO2Risk(spO2: number, source: string): RiskFactor {
    let severity = 0;
    let description = "Blood oxygen normal";
    let confidence = source === "camera" ? 0.82 : source === "sensor" ? 0.98 : 0.75;

    if (spO2 < this.thresholds.spO2.critical) {
      severity = 9;
      description = `Critical oxygen saturation: ${spO2.toFixed(0)}%`;
    } else if (spO2 < this.thresholds.spO2.low) {
      severity = 5;
      description = `Low oxygen saturation: ${spO2.toFixed(0)}%`;
    } else if (spO2 < 95) {
      severity = 2;
      description = `Borderline oxygen saturation: ${spO2.toFixed(0)}%`;
    }

    return {
      id: `spo2-${Date.now()}`,
      type: "vital",
      severity,
      confidence,
      timestamp: new Date(),
      description,
      evidence: { spO2, source, threshold: this.thresholds.spO2 }
    };
  }

  private assessTemperatureRisk(temperature: number, source: string): RiskFactor {
    let severity = 0;
    let description = "Body temperature normal";
    let confidence = source === "camera" ? 0.75 : source === "sensor" ? 0.95 : 0.8;

    if (temperature < this.thresholds.temperature.critical.low || temperature > this.thresholds.temperature.critical.high) {
      severity = 7;
      description = `Critical body temperature: ${temperature.toFixed(1)}°C`;
    } else if (temperature < this.thresholds.temperature.low || temperature > this.thresholds.temperature.high) {
      severity = 3;
      description = `Abnormal body temperature: ${temperature.toFixed(1)}°C`;
    } else if (temperature < 36.0 || temperature > 37.8) {
      severity = 1;
      description = `Borderline body temperature: ${temperature.toFixed(1)}°C`;
    }

    return {
      id: `temp-${Date.now()}`,
      type: "vital",
      severity,
      confidence,
      timestamp: new Date(),
      description,
      evidence: { temperature, source, threshold: this.thresholds.temperature }
    };
  }

  private applyTimeDecay(currentScore: number, now: Date): number {
    if (this.riskHistory.length === 0) return currentScore;
    
    const lastScore = this.riskHistory[this.riskHistory.length - 1];
    const timeDelta = (now.getTime() - new Date().getTime()) / (1000 * 60); // minutes
    
    const decayedBase = lastScore * Math.exp(-this.weightDecayRate * timeDelta);
    return decayedBase + currentScore;
  }

  private calculateTrend(): "stable" | "rising" | "falling" {
    if (this.riskHistory.length < 3) return "stable";
    
    const recent = this.riskHistory.slice(-3);
    const avgChange = (recent[2] - recent[0]) / 2;
    
    if (Math.abs(avgChange) < 0.5) return "stable";
    return avgChange > 0 ? "rising" : "falling";
  }

  private calculateConfidence(factors: RiskFactor[], source: string): number {
    if (factors.length === 0) return 0.95;
    
    const avgConfidence = factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length;
    const sourceMultiplier = source === "camera" ? 0.9 : source === "sensor" ? 1.0 : 0.8;
    
    return Math.min(0.99, avgConfidence * sourceMultiplier);
  }

  private updateEnvironmentalFactors(now: Date): void {
    const expiredKeys: string[] = [];
    
    for (const [key, factor] of this.environmentalFactors) {
      const ageMinutes = (now.getTime() - factor.timestamp.getTime()) / (1000 * 60);
      
      // Decay environmental factors over time
      if (ageMinutes > 30) {
        expiredKeys.push(key);
      } else {
        // Apply time decay
        factor.confidence *= Math.exp(-0.05 * ageMinutes);
        factor.severity *= Math.exp(-0.03 * ageMinutes);
      }
    }
    
    expiredKeys.forEach(key => this.environmentalFactors.delete(key));
  }

  // Public methods for adding environmental factors
  addEnvironmentalFactor(factor: Omit<RiskFactor, "id" | "timestamp">): void {
    const id = `env-${factor.type}-${Date.now()}`;
    this.environmentalFactors.set(id, {
      ...factor,
      id,
      timestamp: new Date()
    });
  }

  addFallDetection(severity: number = 8): void {
    this.addEnvironmentalFactor({
      type: "sensor",
      severity,
      confidence: 0.92,
      description: "Fall detected by accelerometer",
      evidence: { sensorType: "accelerometer", threshold: 25 }
    });
  }

  addVoiceStress(stressLevel: number): void {
    const severity = Math.min(6, stressLevel * 6);
    this.addEnvironmentalFactor({
      type: "behavioral",
      severity,
      confidence: 0.78,
      description: `Voice stress detected: ${(stressLevel * 100).toFixed(0)}%`,
      evidence: { stressLevel, analysisType: "voice" }
    });
  }

  // Diagnostic methods
  getDiagnostics() {
    return {
      vitalHistory: this.vitalHistory.slice(-10),
      riskHistory: this.riskHistory.slice(-10),
      environmentalFactors: Array.from(this.environmentalFactors.values()),
      thresholds: this.thresholds,
      systemHealth: {
        smoothingWindow: this.smoothingWindow,
        decayRate: this.weightDecayRate,
        historyLength: this.riskHistory.length
      }
    };
  }

  reset(): void {
    this.riskHistory = [];
    this.vitalHistory = [];
    this.environmentalFactors.clear();
  }
}

export const useRiskScoreEngine = () => {
  const [engine] = useState(() => new RiskScoreEngine());
  const [riskState, setRiskState] = useState<RiskScoreState>({
    current: 0,
    trend: "stable",
    factors: [],
    lastUpdate: new Date(),
    confidence: 0.95
  });

  const updateRisk = useCallback((vitals: VitalReading, environmentalData?: any) => {
    const newState = engine.calculateRiskScore(vitals, environmentalData);
    setRiskState(newState);
    return newState;
  }, [engine]);

  const addEnvironmentalRisk = useCallback((factor: Omit<RiskFactor, "id" | "timestamp">) => {
    engine.addEnvironmentalFactor(factor);
  }, [engine]);

  const getDiagnostics = useCallback(() => {
    return engine.getDiagnostics();
  }, [engine]);

  return {
    riskState,
    updateRisk,
    addEnvironmentalRisk,
    getDiagnostics,
    engine
  };
};