'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Award } from 'lucide-react';

type DataPoint = {
  date: string;
  value: number;
};

type AccountData = {
  data: DataPoint[];
  trend: number;
  average: number;
};

type DashboardData = {
  [key: string]: AccountData;
};

const calculateTrend = (data: DataPoint[]): number => {
  if (data.length < 2) return 0;
  const firstValue = data[0].value;
  const lastValue = data[data.length - 1].value;
  return ((lastValue - firstValue) / firstValue) * 100;
};

const calculateAverage = (data: DataPoint[]): number => {
  return data.reduce((sum, point) => sum + point.value, 0) / data.length;
};

export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rawData, setRawData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('Not yet updated');
  const [nextUpdateDay, setNextUpdateDay] = useState<string>('Calculating...');

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      calculateNextUpdateDay();
      
      // Check every day at 1 AM if it's an update day
      const now = new Date();
      const tomorrow1AM = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        1, 0, 0
      );
      
      const timeUntilCheck = tomorrow1AM.getTime() - now.getTime();
      
      const dailyCheck = setInterval(() => {
        const today = new Date().getDay();
        // 1 is Monday, 3 is Wednesday, 5 is Friday
        if ([1, 3, 5].includes(today)) {
          fetchData();
        }
        calculateNextUpdateDay();
      }, 24 * 60 * 60 * 1000); // Check every 24 hours

      // Initial delay to start the daily checks at 1 AM
      setTimeout(() => {
        const today = new Date().getDay();
        if ([1, 3, 5].includes(today)) {
          fetchData();
        }
        calculateNextUpdateDay();
      }, timeUntilCheck);

      return () => clearInterval(dailyCheck);
    }
  }, [isLoggedIn]);

  const calculateNextUpdateDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    
    // Find the next update day
    let nextDay;
    if (today < 1) nextDay = 1; // If Sunday, next is Monday
    else if (today < 3) nextDay = 3; // If Monday or Tuesday, next is Wednesday
    else if (today < 5) nextDay = 5; // If Wednesday or Thursday, next is Friday
    else nextDay = 8; // If Friday or Saturday, next is Monday (add 8 to get to next week's Monday)
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + ((nextDay + 7 - today) % 7));
    setNextUpdateDay(`${days[nextDay % 7]}, ${nextDate.toLocaleDateString()}`);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sheets-data');
      const result = await response.json();
      // Process the data
      const processedData: DashboardData = {};
      Object.entries(result).forEach(([account, points]: [string, any]) => {
        processedData[account] = {
          data: points,
          trend: calculateTrend(points),
          average: calculateAverage(points)
        };
      });
      setRawData(processedData);
      setLastUpdate(new Date().toLocaleString());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const password = form.password.value;
    if (password === process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD) {
      setIsLoggedIn(true);
    }
  };

  const findBestAndWorstAccounts = () => {
    if (Object.keys(rawData).length === 0) return { best: null, worst: null };
    
    const accounts = Object.entries(rawData);
    const sortedByTrend = accounts.sort((a, b) => b[1].trend - a[1].trend);
    
    return {
      best: sortedByTrend[0],
      worst: sortedByTrend[sortedByTrend.length - 1]
    };
  };

  const { best, worst } = findBestAndWorstAccounts();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Dashboard Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              name="password"
              placeholder="Enter dashboard password"
              className="w-full p-2 border rounded"
              required
            />
            <button
              type="submit"
              className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Performance Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-white text-sm">
              <div>Last updated: {lastUpdate}</div>
              <div className="text-gray-400">Next update: {nextUpdateDay}</div>
            </div>
            <button
              onClick={() => {
                fetchData();
                calculateNextUpdateDay();
              }}
              disabled={loading}
              className="bg-yellow-500 p-2 rounded hover:bg-yellow-600 text-white"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Performance Overview */}
        {best && worst && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Award className="text-yellow-500" />
                <h3 className="text-xl font-bold">Best Performing Account</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-500">{best[0]}</p>
              <p className="text-sm text-gray-600">
                Trend: <span className="text-green-500">+{best[1].trend.toFixed(2)}%</span>
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="text-red-500" />
                <h3 className="text-xl font-bold">Account Needing Attention</h3>
              </div>
              <p className="text-2xl font-bold text-red-500">{worst[0]}</p>
              <p className="text-sm text-gray-600">
                Trend: <span className="text-red-500">{worst[1].trend.toFixed(2)}%</span>
              </p>
            </div>
          </div>
        )}

        {/* Individual Account Charts */}
        {loading ? (
          <div className="text-white">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(rawData).map(([account, accountData]) => (
              <div key={account} className="bg-white p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{account}</h2>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={accountData.trend >= 0 ? 'text-green-500' : 'text-red-500'} />
                    <span className={`font-bold ${accountData.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {accountData.trend.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accountData.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis 
                        dataKey="date"
                        tick={{ fill: '#666666' }}
                        tickLine={{ stroke: '#666666' }}
                      />
                      <YAxis 
                        tick={{ fill: '#666666' }}
                        tickLine={{ stroke: '#666666' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff',
                          border: '1px solid #d1d1d1'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#00008B"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 6,
                          style: { fill: '#00008B', stroke: '#fff' }
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Average: {accountData.average.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}