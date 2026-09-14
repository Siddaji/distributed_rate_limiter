import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    allowedRequests: 0,
    blockedRequests: 0
  });

  useEffect(() => {
    fetch("http://localhost:5000/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
      })
      .catch((error) => {
        console.error("Error fetching stats:", error);
      });
  }, []);

  return (
    <div className="dashboard">
      <h1>Rate Limiter Dashboard</h1>

      <div className="cards">
        <div className="card">
          <h2>Total Requests</h2>
          <p>{stats.totalRequests}</p>
        </div>

        <div className="card">
          <h2>Allowed Requests</h2>
          <p>{stats.allowedRequests}</p>
        </div>

        <div className="card">
          <h2>Blocked Requests</h2>
          <p>{stats.blockedRequests}</p>
        </div>
      </div>
    </div>
  );
}

export default App;