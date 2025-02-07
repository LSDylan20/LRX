import React, { useState, useEffect } from 'react';
import { predictRate, type RatePrediction } from '../../lib/ai';
import type { Database } from '../../lib/database.types';
import { DollarSign, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from 'lucide-react';

type Load = Database['public']['Tables']['loads']['Row'];

interface RateCalculatorProps {
  load: Load;
  onRateSelected?: (rate: number) => void;
}

export default function RateCalculator({ load, onRateSelected }: RateCalculatorProps) {
  const [prediction, setPrediction] = useState<RatePrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<number | null>(null);

  useEffect(() => {
    calculateRate();
  }, [load]);

  const calculateRate = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await predictRate(load);
      setPrediction(result);
      setSelectedRate(result.predictedRate);

      if (onRateSelected) {
        onRateSelected(result.predictedRate);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    setSelectedRate(rate);
    if (onRateSelected) {
      onRateSelected(rate);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p className="font-medium">Error calculating rate</p>
        </div>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!prediction) return null;

  const getTrendIcon = () => {
    switch (prediction.marketTrends.trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Rate Calculator</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Market Trend:</span>
          {getTrendIcon()}
          <span className="text-sm font-medium">
            {prediction.marketTrends.percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Suggested Rate
          </label>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <input
              type="number"
              value={selectedRate || ''}
              onChange={handleRateChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter rate"
            />
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">AI Prediction Details</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">Confidence</span>
              <span className={`text-sm font-medium ${getConfidenceColor(prediction.confidence)}`}>
                {(prediction.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-sm text-blue-600">Factors Considered:</span>
              <ul className="mt-1 space-y-1">
                {prediction.factors.map((factor, index) => (
                  <li key={index} className="text-sm text-blue-800">
                    • {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {Math.abs(selectedRate! - prediction.predictedRate) / prediction.predictedRate > 0.2 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">
                Selected rate differs significantly from the market average.
                Consider adjusting based on the factors above.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}