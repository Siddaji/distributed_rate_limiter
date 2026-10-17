
import { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

import "./App.css";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://distributed-rate-limiter-dvbj.onrender.com";

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

  // Authentication state
  const [token, setToken] = useState(
    () => localStorage.getItem("rateLimiterToken") || ""
  );

  const [authMode, setAuthMode] = useState("login");

  const [authForm, setAuthForm] = useState({
    username: "",
    password: "",
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  // Rate-limit utilization state
  const [rateLimit, setRateLimit] = useState(null);
  const [rateLimitError, setRateLimitError] = useState("");
  const [rateLimitLoading, setRateLimitLoading] = useState(false);

  // =========================
  // Authentication form
  // =========================

  const handleAuthChange = (event) => {
    const { name, value } = event.target;

    setAuthForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    try {
      const endpoint =
        authMode === "register" ? "/auth/register" : "/auth/login";

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: authForm.username.trim(),
          password: authForm.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (authMode === "register") {
        setAuthMessage(
          "Registration successful. You can now log in."
        );
        setAuthMode("login");
        setAuthForm((previous) => ({
          ...previous,
          password: "",
        }));
        return;
      }

      if (!data.token) {
        throw new Error("Login succeeded but no token was returned.");
      }

      localStorage.setItem("rateLimiterToken", data.token);
      setToken(data.token);
      setRateLimit(null);
      setRateLimitError("");
      setAuthForm({
        username: "",
        password: "",
      });
      setAuthMessage("Login successful.");
    } catch (error) {
      setAuthError(
        error.message || "Unable to connect to the API."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("rateLimiterToken");
    setToken("");
    setRateLimit(null);
    setRateLimitError("");
    setAuthError("");
    setAuthMessage("You have been logged out.");
  };

  // =========================
  // Real-time statistics
  // =========================

  useEffect(() => {
    let active = true;

    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/stats`);

        if (!response.ok) {
          throw new Error("Unable to fetch statistics.");
        }

        const data = await response.json();

        if (active) {
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();

    const interval = setInterval(fetchStats, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // =========================
  // API and Redis health
  // =========================

  useEffect(() => {
    let active = true;

    const fetchHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`);

        if (!response.ok) {
          throw new Error("Unable to fetch health data.");
        }

        const data = await response.json();

        if (active) {
          setHealth(data);
        }
      } catch (error) {
        console.error("Error fetching health data:", error);

        if (active) {
          setHealth({
            status: "unhealthy",
            redis: "disconnected",
            uptime: 0,
          });
        }
      }
    };

    fetchHealth();

    const interval = setInterval(fetchHealth, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // =========================
  // Requests per second
  // =========================

  useEffect(() => {
    let active = true;

    const fetchRequestRate = async () => {
      try {
        const response = await fetch(`${API_BASE}/request-rate`);

        if (!response.ok) {
          throw new Error("Unable to fetch request rate.");
        }

        const data = await response.json();

        if (active) {
          setRequestRate(data);
        }
      } catch (error) {
        console.error("Error fetching request rate:", error);
      }
    };

    fetchRequestRate();

    const interval = setInterval(fetchRequestRate, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // =========================
  // Authenticated rate-limit status
  // =========================

  useEffect(() => {
    if (!token) {
      setRateLimit(null);
      setRateLimitError("");
      setRateLimitLoading(false);
      return;
    }

    let active = true;

    const fetchRateLimit = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/rate-limit-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401 && active) {
            localStorage.removeItem("rateLimiterToken");
            setToken("");
            setRateLimit(null);
          }

          throw new Error(
            data.message || "Unable to fetch rate-limit status."
          );
        }

        if (active) {
          setRateLimit(data);
          setRateLimitError("");
        }
      } catch (error) {
        if (active) {
          setRateLimitError(error.message);
        }
      } finally {
        if (active) {
          setRateLimitLoading(false);
        }
      }
    };

    setRateLimitLoading(true);
    fetchRateLimit();

    const interval = setInterval(fetchRateLimit, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token]);

  // =========================
  // Calculations
  // =========================

  const blockRate =
    stats.totalRequests > 0
      ? (
          (stats.blockedRequests / stats.totalRequests) *
          100
        ).toFixed(1)
      : 0;

  const allowedPercentage =
    stats.totalRequests > 0
      ? (
          (stats.allowedRequests / stats.totalRequests) *
          100
        ).toFixed(1)
      : 0;

  const utilization = Math.min(
    100,
    Math.max(0, Number(rateLimit?.utilizationPercentage) || 0)
  );

  // =========================
  // Chart data
  // =========================

  const trafficData = [
    {
      name: "Requests",
      allowed: stats.allowedRequests,
      blocked: stats.blockedRequests,
    },
  ];

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
            className={`status-dot ${
              health.status === "healthy"
                ? "live"
                : "offline-dot"
            }`}
          ></span>

          {health.status === "healthy"
            ? "Live · API Online"
            : "API Offline"}
        </div>
      </header>

      <main>
        {/* Authentication */}

        <section className="panel auth-panel">
          <div className="panel-header">
            <div>
              <h3>
                {token
                  ? "Your Account"
                  : authMode === "login"
                    ? "Sign in to your account"
                    : "Create your account"}
              </h3>

              <p>
                {token
                  ? "Your personal rate-limit information"
                  : "Sign in to view your personal rate-limit utilization"}
              </p>
            </div>

            {token && (
              <button
                type="button"
                className="auth-button secondary"
                onClick={handleLogout}
              >
                Log out
              </button>
            )}
          </div>

          {!token && (
            <form onSubmit={handleAuthSubmit} className="auth-form">
              <label htmlFor="auth-username">Username</label>

              <input
                id="auth-username"
                type="text"
                name="username"
                autoComplete="username"
                minLength={3}
                maxLength={20}
                value={authForm.username}
                onChange={handleAuthChange}
                placeholder="Enter your username"
                required
              />

              <label htmlFor="auth-password">Password</label>

              <input
                id="auth-password"
                type="password"
                name="password"
                autoComplete={
                  authMode === "login"
                    ? "current-password"
                    : "new-password"
                }
                minLength={6}
                maxLength={50}
                value={authForm.password}
                onChange={handleAuthChange}
                placeholder="Enter your password"
                required
              />

              {authError && (
                <p className="error-message" role="alert">
                  {authError}
                </p>
              )}

              {authMessage && (
                <p className="success-message" role="status">
                  {authMessage}
                </p>
              )}

              <button
                type="submit"
                className="auth-button"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Sign in"
                    : "Create account"}
              </button>

              <p className="auth-switch">
                {authMode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setAuthMode(
                      authMode === "login" ? "register" : "login"
                    );
                    setAuthError("");
                    setAuthMessage("");
                  }}
                >
                  {authMode === "login" ? "Register" : "Sign in"}
                </button>
              </p>
            </form>
          )}

          {token && (
            <div className="account-status">
              <span className="status-dot live"></span>
              <span>Authenticated · Free plan</span>
            </div>
          )}
        </section>

        {/* Personal Rate-limit Utilization */}

        {token && (
          <section className="panel utilization-panel">
            <div className="panel-header">
              <div>
                <h3>Rate-limit Utilization</h3>
                <p>
                  Your current Fixed Window request usage
                </p>
              </div>

              <span className="utilization-badge">
                {rateLimit ? `${utilization}% used` : "Loading"}
              </span>
            </div>

            {rateLimitError && (
              <p className="error-message" role="alert">
                {rateLimitError}
              </p>
            )}

            {rateLimitLoading && !rateLimit && (
              <p>Loading your rate-limit status...</p>
            )}

            {rateLimit && (
              <>
                <div
                  className="utilization-progress"
                  role="progressbar"
                  aria-label="Rate-limit utilization"
                  aria-valuenow={utilization}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="utilization-progress-fill"
                    style={{ width: `${utilization}%` }}
                  ></div>
                </div>

                <div className="utilization-stats">
                  <div>
                    <span>Requests used</span>
                    <strong>
                      {rateLimit.used} / {rateLimit.limit}
                    </strong>
                  </div>

                  <div>
                    <span>Requests remaining</span>
                    <strong>{rateLimit.remaining}</strong>
                  </div>

                  <div>
                    <span>Utilization</span>
                    <strong>{utilization}%</strong>
                  </div>

                  <div>
                    <span>Window resets in</span>
                    <strong>
                      {rateLimit.resetInSeconds > 0
                        ? `${rateLimit.resetInSeconds}s`
                        : "No active window"}
                    </strong>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Statistics */}

        <section className="stats-grid">
          <div className="stat-card">
            <span>Total Requests</span>
            <h2 className="stat-number">
              {(stats.totalRequests ?? 0).toLocaleString()}
            </h2>
            <p>All API requests</p>
          </div>

          <div className="stat-card">
            <span>Allowed Requests</span>
            <h2 className="stat-number">
              {(stats.allowedRequests ?? 0).toLocaleString()}
            </h2>
            <p>Requests passed</p>
          </div>

          <div className="stat-card">
            <span>Blocked Requests</span>
            <h2 className="stat-number">
              {(stats.blockedRequests ?? 0).toLocaleString()}
            </h2>
            <p>Rate limited requests</p>
          </div>

          <div className="stat-card">
            <span>Block Rate</span>
            <h2 className="stat-number">{blockRate}%</h2>
            <p>Traffic rejected</p>
          </div>
        </section>

        {/* Overview + System Status */}

        <section className="content-grid">
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
                <strong>{allowedPercentage}%</strong>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${allowedPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-label">
                <span>Blocked</span>
                <strong>{blockRate}%</strong>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill blocked"
                  style={{ width: `${blockRate}%` }}
                ></div>
              </div>
            </div>
          </div>

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
              <strong>{health.uptime}s</strong>
            </div>

            <div className="system-item">
              <span>Rate Limiter</span>
              <strong className="online">Active</strong>
            </div>

            <div className="system-item">
              <span>Algorithms</span>
              <strong>2 Active</strong>
            </div>
          </div>
        </section>

        {/* Requests Per Second */}

        <section className="chart-panel">
          <div className="panel-header">
            <div>
              <h3>Requests per Second</h3>
              <p>Real-time API traffic over the last 10 seconds</p>
            </div>

            <span className="chart-live">● Live</span>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={requestRate}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="second"
                  tickFormatter={(value) =>
                    new Date(value * 1000).toLocaleTimeString(
                      [],
                      {
                        minute: "2-digit",
                        second: "2-digit",
                      }
                    )
                  }
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                />

                <Tooltip
                  cursor={{ strokeDasharray: "4 4" }}
                  labelFormatter={(value) =>
                    new Date(value * 1000).toLocaleTimeString()
                  }
                  formatter={(value) => [value, "Requests/sec"]}
                />

                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#111827"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 7 }}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Allowed vs Blocked */}

        <section className="chart-panel">
          <div className="panel-header">
            <div>
              <h3>Allowed vs Blocked Requests</h3>
              <p>Current request distribution</p>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trafficData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis dataKey="name" tick={{ fontSize: 11 }} />

                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                />

                <Tooltip />

                <Bar
                  dataKey="allowed"
                  name="Allowed"
                  fill="#111827"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  dataKey="blocked"
                  name="Blocked"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Algorithms */}

        <section className="algorithm-panel">
          <div>
            <h3>Rate Limiting Algorithms</h3>
            <p>Algorithms currently implemented in the system</p>
          </div>

          <div className="algorithm-grid">
            <div className="algorithm-card">
              <div className="algorithm-number">01</div>
              <h4>Fixed Window</h4>
              <p>
                Controls requests within a time window using Redis
                counters and TTL.
              </p>
            </div>

            <div className="algorithm-card">
              <div className="algorithm-number">02</div>
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
