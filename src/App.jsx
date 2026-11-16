import React, { useState, useEffect } from 'react';
import WeatherCard from './components/WeatherCard';
import ForecastCard from './components/ForecastCard';
import NewsCard from './components/NewsCard';
import AlertsCard from './components/AlertsCard';
import SearchBar from './components/SearchBar';
import StatusBar from './components/StatusBar';
import { fetchDashboardData } from './services/dashboardService';
import { usePolling } from './hooks/usePolling';
import { getFastestSource, fetchWithRetry } from './utils/asyncPatterns';

function App() {
  const [city, setCity] = useState('San Francisco');
  const [dashboardData, setDashboardData] = useState({
    weather: null,
    forecast: null,
    news: null,
    alerts: null
  });
  const [loading, setLoading] = useState({
    weather: false,
    forecast: false,
    news: false,
    alerts: false
  });
  const [errors, setErrors] = useState({
    weather: null,
    forecast: null,
    news: null,
    alerts: null
  });

  const fetchAllData = async (cityName) => {
    setLoading({ weather: true, forecast: true, news: true, alerts: true });

    // Tier 1: each card fills (or turns red) as soon as its own request settles
    await fetchDashboardData(cityName, (name, data, errorMessage) => {
      if (data) {
        setDashboardData(prev => ({ ...prev, [name]: data }));
      }
      setErrors(prev => ({ ...prev, [name]: errorMessage }));
      setLoading(prev => ({ ...prev, [name]: false }));
    });
  };

  // Tier 2: the fastest of three weather sources
  useEffect(() => {
    const urls = [1, 2, 3].map(
      n => `http://localhost:3001/weather-source${n}?city=${encodeURIComponent(city)}`
    );
    getFastestSource(urls)
      .then(result => console.log('Fastest source:', result.source))
      .catch(error => console.error('All sources failed:', error));
  }, []);

  // Tier 3: a 404 fails at once, with no retry
  useEffect(() => {
    fetchWithRetry('http://localhost:3001/nope')
      .catch(error => console.log('Tier 3 /nope failed without retry:', error.message));
  }, []);

  useEffect(() => {
    fetchAllData(city);
  }, [city]);

  usePolling(() => fetchAllData(city), 30000);

  const handleRefresh = () => {
    fetchAllData(city);
  };

  const handleCityChange = (newCity) => {
    setCity(newCity);
  };

  const isAnyLoading = Object.values(loading).some(l => l);

  return (
    <div className="container">
      <header className="header">
        <h1>Weather Dashboard</h1>
        <p>Advanced Async Patterns Demo</p>
      </header>

      <StatusBar
        loading={loading}
        errors={errors}
        lastUpdate={dashboardData.weather?.timestamp}
      />

      <div className="search-section">
        <SearchBar onCityChange={handleCityChange} />
        <button
          className="btn"
          onClick={handleRefresh}
          disabled={isAnyLoading}
        >
          {isAnyLoading ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      <div className="dashboard-grid">
        <WeatherCard
          data={dashboardData.weather}
          loading={loading.weather}
          error={errors.weather}
        />
        <ForecastCard
          data={dashboardData.forecast}
          loading={loading.forecast}
          error={errors.forecast}
        />
        <NewsCard
          data={dashboardData.news}
          loading={loading.news}
          error={errors.news}
        />
        <AlertsCard
          data={dashboardData.alerts}
          loading={loading.alerts}
          error={errors.alerts}
        />
      </div>

      {/* TODO: Add these features */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Problems to Fix:</h2>
        <ul style={{ paddingLeft: '20px', color: '#666' }}>
          <li>❌ No retry when requests fail (30% failure rate!)</li>
          <li>❌ No caching (duplicate requests waste bandwidth)</li>
          <li>❌ Sequential loading (should load in parallel)</li>
          <li>❌ Race conditions in search (type fast and see wrong results)</li>
          <li>❌ No request timeouts (can hang forever)</li>
          <li>❌ No polling for updates</li>
        </ul>
      </div>
    </div>
  );
}

export default App;