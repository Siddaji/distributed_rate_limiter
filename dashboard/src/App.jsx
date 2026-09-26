import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

function App() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    allowedRequests: 0,
    blockedRequests: 0,
  });

  const [health, setHealth] = useState({
    status: "checking",
    redis: "checking",
    uptime: 0,
  });

  const [requestRate, setRequestRate] = useState([]);

  // Real-time statistics
  useEffect(() => {
    const fetchStats = () => {
      fetch("https://distributed-rate-limiter-dvbj.onrender.com/stats")
        .then((res) => res.json())
        .then((data) => {
          setStats(data);
        })
        .catch((error) => {
          console.error("Error fetching stats:", error);
        });
    };

    fetchStats();

    const interval = setInterval(fetchStats, 2000);

    return () => clearInterval(interval);
  }, []);

  // API and Redis health
  useEffect(() => {
    const fetchHealth = () => {
      fetch("https://distributed-rate-limiter-dvbj.onrender.com/health")
        .then((res) => res.json())
        .then((data) => {
          setHealth(data);
        })
        .catch((error) => {
          console.error("Error fetching health data:", error);

          setHealth({
            status: "unhealthy",
            redis: "disconnected",
            uptime: 0,
          });
        });
    };

    fetchHealth();

    const interval = setInterval(fetchHealth, 5000);

    return () => clearInterval(interval);
  }, []);

  // Requests per second
  useEffect(() => {
    const fetchRequestRate = () => {
      fetch("https://distributed-rate-limiter-dvbj.onrender.com/request-rate")
        .then((res) => res.json())
        .then((data) => {
          console.log("Request rate data:", data);
          setRequestRate(data);
        })
        .catch((error) => {
          console.error("Error fetching request rate:", error);
        });
    };

    fetchRequestRate();

    const interval = setInterval(fetchRequestRate, 2000);

    return () => clearInterval(interval);
  }, []);

  const blockRate =
    stats.totalRequests > 0
      ? ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(1)
      : 0;

  const allowedPercentage =
    stats.totalRequests > 0
      ? ((stats.allowedRequests / stats.totalRequests) * 100).toFixed(1)
      : 0;

  return (
    <div className="dashboard">

      {/* Header */}
      <header className="header">
        <div>
          <h1>Rate Limiter</h1>
          <p>Distributed API monitoring dashboard</p>
        </div>

        <div className="status">
          <span
            className="status-dot"
            style={{
              background:
                health.status === "healthy" ? "#22c55e" : "#ef4444",
            }}
          ></span>

          {health.status === "healthy"
            ? "API Online"
            : "API Offline"}
        </div>
      </header>

      <main>

        {/* Statistics */}
        <section className="stats-grid">

          <div className="stat-card">
            <span>Total Requests</span>
            <h2>{(stats.totalRequests ?? 0).toLocaleString()}</h2>
            <p>All API requests</p>
          </div>

          <div className="stat-card">
            <span>Allowed Requests</span>
            <h2>{(stats.allowedRequests ?? 0).toLocaleString()}</h2>
            <p>Requests passed</p>
          </div>

          <div className="stat-card">
            <span>Blocked Requests</span>
            <h2>{(stats.blockedRequests ?? 0).toLocaleString()}</h2>
            <p>Rate limited requests</p>
          </div>

          <div className="stat-card">
            <span>Block Rate</span>
            <h2>{blockRate}%</h2>
            <p>Traffic rejected</p>
          </div>

        </section>

        {/* Overview + System Status */}
        <section className="content-grid">

          {/* Rate Limiting Overview */}
          <div className="panel">

            <div className="panel-header">
              <div>
                <h3>Rate Limiting Overview</h3>
                <p>Current traffic distribution</p>
              </div>
            </div>

            <div className="progress-section">

              <div className="progress-label">
                <span>Allowed</span>

                <strong>
                  {allowedPercentage}%
                </strong>
              </div>

              <div className="progress-bar">

                <div
                  className="progress-fill"
                  style={{
                    width: `${allowedPercentage}%`,
                  }}
                ></div>

              </div>

            </div>

            <div className="progress-section">

              <div className="progress-label">
                <span>Blocked</span>

                <strong>
                  {blockRate}%
                </strong>
              </div>

              <div className="progress-bar">

                <div
                  className="progress-fill blocked"
                  style={{
                    width: `${blockRate}%`,
                  }}
                ></div>

              </div>

            </div>

          </div>

          {/* System Status */}
          <div className="panel">

            <div className="panel-header">
              <div>
                <h3>System Status</h3>
                <p>Backend infrastructure</p>
              </div>
            </div>

            <div className="system-item">
              <span>API Server</span>

              <strong
                className={
                  health.status === "healthy"
                    ? "online"
                    : "offline"
                }
              >
                {health.status === "healthy"
                  ? "Operational"
                  : "Unavailable"}
              </strong>
            </div>

            <div className="system-item">
              <span>Redis</span>

              <strong
                className={
                  health.redis === "connected"
                    ? "online"
                    : "offline"
                }
              >
                {health.redis === "connected"
                  ? "Connected"
                  : "Disconnected"}
              </strong>
            </div>

            <div className="system-item">
              <span>Server Uptime</span>

              <strong>
                {health.uptime}s
              </strong>
            </div>

            <div className="system-item">
              <span>Rate Limiter</span>

              <strong className="online">
                Active
              </strong>
            </div>

            <div className="system-item">
              <span>Algorithms</span>

              <strong>
                2 Active
              </strong>
            </div>

          </div>

        </section>

        {/* Requests Per Second Chart */}
        <section className="chart-panel">

          <div className="panel-header">

            <div>
              <h3>Requests per Second</h3>

              <p>
                Real-time API traffic over the last 10 seconds
              </p>
            </div>

          </div>

          <div className="chart-container">

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <LineChart data={requestRate}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="second"
                  tickFormatter={(value) =>
                    new Date(value * 1000).toLocaleTimeString()
                  }
                />

                <YAxis
                  allowDecimals={false}
                />

                <Tooltip
                  labelFormatter={(value) =>
                    new Date(value * 1000).toLocaleTimeString()
                  }
                  formatter={(value) => [
                    value,
                    "Requests",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </section>

        {/* Algorithms */}
        <section className="algorithm-panel">

          <div>
            <h3>Rate Limiting Algorithms</h3>

            <p>
              Algorithms currently implemented in the system
            </p>
          </div>

          <div className="algorithm-grid">

            <div className="algorithm-card">

              <div className="algorithm-number">
                01
              </div>

              <h4>Fixed Window</h4>

              <p>
                Controls requests within a fixed time
                window using Redis counters and TTL.
              </p>

            </div>

            <div className="algorithm-card">

              <div className="algorithm-number">
                02
              </div>

              <h4>Token Bucket</h4>

              <p>
                Allows controlled bursts while continuously
                refilling tokens over time.
              </p>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;