import Analytics from '../models/analytics.model';
import Link from '../models/link.model';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface PredictionResult {
  linkId: string;
  predictedClicks: {
    next24Hours: number;
    next7Days: number;
    next30Days: number;
  };
  confidence: number;
  trend: 'growing' | 'stable' | 'declining';
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
  recommendations: string[];
}

interface HistoricalData {
  date: Date;
  clicks: number;
}

class PredictionService {
  /**
   * Predict future clicks for a link using historical data analysis
   */
  async predictClicks(linkId: string, userId: string): Promise<PredictionResult | null> {
    try {
      // Verify link ownership
      const link = await Link.findOne({ _id: linkId, userId });
      if (!link) {
        return null;
      }

      // Get historical click data
      const historicalData = await this.getHistoricalData(linkId);
      if (historicalData.length < 3) {
        // Not enough data for prediction
        return this.createBasicPrediction(link);
      }

      // Calculate metrics
      const recentAverage = this.calculateRecentAverage(historicalData);
      const trend = this.calculateTrend(historicalData);
      const growthRate = this.calculateGrowthRate(historicalData);
      const seasonalFactors = this.analyzeSeasonality(historicalData);
      const factors = this.analyzeImpactFactors(link, historicalData);

      // Predict future clicks
      const predictions = this.calculatePredictions(
        recentAverage,
        growthRate,
        seasonalFactors,
        factors
      );

      // Calculate confidence score
      const confidence = this.calculateConfidence(historicalData, predictions);

      // Generate recommendations
      const recommendations = this.generateRecommendations(trend, factors, link);

      return {
        linkId,
        predictedClicks: predictions,
        confidence,
        trend,
        factors,
        recommendations,
      };
    } catch (error) {
      logger.error('Click prediction error:', error);
      throw error;
    }
  }

  /**
   * Get historical click data grouped by day
   */
  private async getHistoricalData(linkId: string): Promise<HistoricalData[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const data = await Analytics.aggregate([
      {
        $match: {
          linkId: new mongoose.Types.ObjectId(linkId),
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return data.map(d => ({
      date: new Date(d._id),
      clicks: d.clicks,
    }));
  }

  /**
   * Calculate recent average clicks (last 7 days)
   */
  private calculateRecentAverage(data: HistoricalData[]): number {
    const recentData = data.slice(-7);
    if (recentData.length === 0) return 0;
    const sum = recentData.reduce((acc, d) => acc + d.clicks, 0);
    return sum / recentData.length;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(data: HistoricalData[]): 'growing' | 'stable' | 'declining' {
    if (data.length < 7) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((acc, d) => acc + d.clicks, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc, d) => acc + d.clicks, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100;

    if (changePercent > 10) return 'growing';
    if (changePercent < -10) return 'declining';
    return 'stable';
  }

  /**
   * Calculate daily growth rate
   */
  private calculateGrowthRate(data: HistoricalData[]): number {
    if (data.length < 2) return 0;

    const growthRates: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const prevClicks = data[i - 1].clicks || 1;
      const rate = (data[i].clicks - prevClicks) / prevClicks;
      growthRates.push(rate);
    }

    // Return median growth rate for stability
    growthRates.sort((a, b) => a - b);
    return growthRates[Math.floor(growthRates.length / 2)] || 0;
  }

  /**
   * Analyze seasonality patterns (day of week effects)
   */
  private analyzeSeasonality(data: HistoricalData[]): Record<number, number> {
    const dayTotals: Record<number, { sum: number; count: number }> = {};

    data.forEach(d => {
      const day = d.date.getDay();
      if (!dayTotals[day]) {
        dayTotals[day] = { sum: 0, count: 0 };
      }
      dayTotals[day].sum += d.clicks;
      dayTotals[day].count += 1;
    });

    const overallAverage = data.reduce((acc, d) => acc + d.clicks, 0) / data.length;

    const seasonalFactors: Record<number, number> = {};
    for (let day = 0; day < 7; day++) {
      if (dayTotals[day] && dayTotals[day].count > 0) {
        const dayAverage = dayTotals[day].sum / dayTotals[day].count;
        seasonalFactors[day] = dayAverage / (overallAverage || 1);
      } else {
        seasonalFactors[day] = 1;
      }
    }

    return seasonalFactors;
  }

  /**
   * Analyze impact factors
   */
  private analyzeImpactFactors(
    link: typeof Link.prototype,
    data: HistoricalData[]
  ): PredictionResult['factors'] {
    const factors: PredictionResult['factors'] = [];

    // Age factor
    const ageInDays = (Date.now() - new Date(link.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 7) {
      factors.push({
        name: 'New link',
        impact: 'positive',
        weight: 0.2,
      });
    } else if (ageInDays > 90) {
      factors.push({
        name: 'Mature link',
        impact: 'neutral',
        weight: 0.05,
      });
    }

    // Custom slug factor
    if (link.slug.length > 10) {
      factors.push({
        name: 'Custom branded slug',
        impact: 'positive',
        weight: 0.1,
      });
    }

    // Password protection factor
    if (link.password) {
      factors.push({
        name: 'Password protected',
        impact: 'negative',
        weight: -0.15,
      });
    }

    // Expiration factor
    if (link.expiresAt) {
      const daysUntilExpiry = (new Date(link.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry < 7) {
        factors.push({
          name: 'Expiring soon',
          impact: 'negative',
          weight: -0.1,
        });
      }
    }

    // Recent activity factor
    if (data.length > 0) {
      const lastClick = data[data.length - 1];
      const daysSinceLastClick = (Date.now() - lastClick.date.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastClick > 7) {
        factors.push({
          name: 'Low recent activity',
          impact: 'negative',
          weight: -0.2,
        });
      }
    }

    return factors;
  }

  /**
   * Calculate predictions based on all factors
   */
  private calculatePredictions(
    recentAverage: number,
    growthRate: number,
    seasonalFactors: Record<number, number>,
    impactFactors: PredictionResult['factors']
  ): PredictionResult['predictedClicks'] {
    // Calculate total impact factor adjustment
    const impactAdjustment = impactFactors.reduce((acc, f) => acc + f.weight, 0);
    const adjustedBase = recentAverage * (1 + impactAdjustment);

    // Calculate average seasonal factor for the next periods
    const avgSeasonal = Object.values(seasonalFactors).reduce((a, b) => a + b, 0) / 7;

    // Apply compound growth for predictions
    const next24Hours = Math.round(adjustedBase * (1 + growthRate) * avgSeasonal);
    const next7Days = Math.round(adjustedBase * 7 * Math.pow(1 + growthRate, 7) * avgSeasonal);
    const next30Days = Math.round(adjustedBase * 30 * Math.pow(1 + growthRate, 30) * avgSeasonal);

    return {
      next24Hours: Math.max(0, next24Hours),
      next7Days: Math.max(0, next7Days),
      next30Days: Math.max(0, next30Days),
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    data: HistoricalData[],
    _predictions: PredictionResult['predictedClicks']
  ): number {
    // Base confidence on data availability
    let confidence = Math.min(data.length / 30, 1) * 0.5;

    // Adjust based on data consistency
    if (data.length > 0) {
      const mean = data.reduce((acc, d) => acc + d.clicks, 0) / data.length;
      const variance = data.reduce((acc, d) => acc + Math.pow(d.clicks - mean, 2), 0) / data.length;
      const coefficientOfVariation = Math.sqrt(variance) / (mean || 1);

      // Lower variance = higher confidence
      confidence += (1 - Math.min(coefficientOfVariation, 1)) * 0.3;
    }

    // Cap between 0.1 and 0.95
    return Math.min(Math.max(confidence, 0.1), 0.95);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    trend: string,
    factors: PredictionResult['factors'],
    link: typeof Link.prototype
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'declining') {
      recommendations.push('Consider sharing your link on social media to boost traffic');
      recommendations.push('Update your link title and description to make it more engaging');
    }

    if (trend === 'growing') {
      recommendations.push('Great job! Your link is gaining traction. Consider creating similar content');
    }

    const hasNegativeFactors = factors.some(f => f.impact === 'negative');
    if (hasNegativeFactors) {
      const negativeFactors = factors.filter(f => f.impact === 'negative');
      negativeFactors.forEach(f => {
        if (f.name === 'Password protected') {
          recommendations.push('Consider removing password protection to increase accessibility');
        }
        if (f.name === 'Low recent activity') {
          recommendations.push('Your link has been inactive. Try promoting it again');
        }
        if (f.name === 'Expiring soon') {
          recommendations.push('Extend the expiration date to continue tracking clicks');
        }
      });
    }

    if (!link.title || !link.description) {
      recommendations.push('Add a title and description to improve link preview');
    }

    if (link.tags.length === 0) {
      recommendations.push('Add tags to organize your link and improve tracking');
    }

    return recommendations.slice(0, 5); // Return max 5 recommendations
  }

  /**
   * Create basic prediction for links with insufficient data
   */
  private createBasicPrediction(link: typeof Link.prototype): PredictionResult {
    const baseEstimate = link.clicks > 0 ? Math.ceil(link.clicks / Math.max(1, this.getLinkAgeInDays(link))) : 1;

    return {
      linkId: String(link._id),
      predictedClicks: {
        next24Hours: baseEstimate,
        next7Days: baseEstimate * 7,
        next30Days: baseEstimate * 30,
      },
      confidence: 0.15,
      trend: 'stable',
      factors: [
        {
          name: 'Insufficient data',
          impact: 'neutral',
          weight: 0,
        },
      ],
      recommendations: [
        'Continue using this link to gather more data for accurate predictions',
        'Share your link to start collecting click data',
      ],
    };
  }

  /**
   * Get link age in days
   */
  private getLinkAgeInDays(link: typeof Link.prototype): number {
    return (Date.now() - new Date(link.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
  }

  /**
   * Get predictions for multiple links
   */
  async predictMultipleLinks(
    linkIds: string[],
    userId: string
  ): Promise<Map<string, PredictionResult>> {
    const results = new Map<string, PredictionResult>();

    await Promise.all(
      linkIds.map(async linkId => {
        const prediction = await this.predictClicks(linkId, userId);
        if (prediction) {
          results.set(linkId, prediction);
        }
      })
    );

    return results;
  }

  /**
   * Get trending links based on growth rate
   */
  async getTrendingLinks(userId: string, limit: number = 10): Promise<{ linkId: string; growthRate: number }[]> {
    const links = await Link.find({ userId, isActive: true }).limit(100);
    const trendingData: { linkId: string; growthRate: number }[] = [];

    for (const link of links) {
      const historicalData = await this.getHistoricalData(String(link._id));
      if (historicalData.length >= 7) {
        const growthRate = this.calculateGrowthRate(historicalData);
        if (growthRate > 0) {
          trendingData.push({ linkId: String(link._id), growthRate });
        }
      }
    }

    return trendingData
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, limit);
  }
}

export const predictionService = new PredictionService();
