# Distributed API Rate Limiter

A distributed API rate limiter built with **Node.js, Express.js, Redis, JWT, React, and Docker Compose**.

The project protects APIs from excessive requests by applying rate limits per authenticated user. Redis is used to maintain shared request counters and token-bucket state, allowing the rate limiter to work across multiple Node.js instances.

## Features

- JWT-based user authentication
- Free and Premium user rate limits
- Per-user rate limiting
- Fixed Window rate limiting
- Token Bucket rate limiting
- Redis-based distributed state
- Atomic Redis `INCR` operations for request counters
- Rate-limit response headers
- Multiple Node.js instance support
- React monitoring dashboard
- Request statistics
- Docker Compose setup for Redis
- Autocannon load and concurrency testing
- Centralized Express error handling
- Authentication and input validation

## Architecture

The application follows a distributed architecture where multiple Node.js instances can share rate-limit state through Redis.

### Architecture Diagram

```text
                    ┌──────────────────┐
                    │      Client      │
                    │ Postman / React  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Node.js +      │
                    │     Express      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    JWT Auth      │
                    │    Middleware    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Rate Limiter   │
                    │                  │
                    │  Fixed Window    │
                    │  Token Bucket    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │      Redis       │
                    │                  │
                    │ Counters         │
                    │ TTL              │
                    │ Token State      │
                    │ Statistics       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    API Routes    │
                    │                  │
                    │ /profile         │
                    │ /token-profile   │
                    │ /stats           │
                    └──────────────────┘
```

### Request Flow

```text
Client Request
      |
      v
Express Server
      |
      v
JWT Authentication
      |
      v
Identify User
      |
      v
Rate Limiter
      |
      v
Redis
      |
      +---- Request allowed ----> API Route ----> Response
      |
      +---- Limit exceeded -----> HTTP 429
```

### Distributed Request Flow

Multiple Node.js instances can use the same Redis instance:

```text
                 Client Requests
                        |
              +---------+---------+
              |                   |
              v                   v
       Node.js Instance 1   Node.js Instance 2
              |                   |
              +---------+---------+
                        |
                        v
                      Redis
                        |
                 Shared Counters
                 & Token State
```

Redis acts as the shared state layer, so rate-limit information is not stored only inside an individual Node.js process.

## Rate Limiting Algorithms

This project implements two rate-limiting algorithms:

- Fixed Window
- Token Bucket

### Fixed Window

The Fixed Window algorithm limits the number of requests a user can make within a fixed time period.

In this project:

- Free users: **5 requests / 60 seconds**
- Premium users: **20 requests / 60 seconds**
- Redis stores the request counter
- Redis TTL tracks the remaining window time
- Requests beyond the limit receive HTTP `429 Too Many Requests`

Example:

```text
60-second window

Request 1  -> Allowed
Request 2  -> Allowed
Request 3  -> Allowed
Request 4  -> Allowed
Request 5  -> Allowed
Request 6  -> 429 Too Many Requests
```

Redis key:

```text
rate-limit:user:<userId>
```

The counter is incremented using Redis `INCR`.

### Token Bucket

The Token Bucket algorithm maintains a bucket containing a limited number of tokens.

In this project:

- Bucket capacity: **5 tokens**
- Refill rate: **1 token / second**
- Each request consumes one token
- If no token is available, the request receives HTTP `429 Too Many Requests`

Example:

```text
Initial bucket

[● ● ● ● ●]

Request 1 -> [● ● ● ●]

Request 2 -> [● ● ●]

Request 3 -> [● ●]

Request 4 -> [●]

Request 5 -> []

Request 6 -> 429

After 1 second

[●]

Next request -> Allowed
```

Redis stores the current token count and the last refill timestamp.

### Rate Limit Headers

Rate-limited API responses include:

```text
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

Example:

```text
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 60
```

## Authentication

The API uses **JWT (JSON Web Token)** for authentication.

### Authentication Flow

```text
Register
   |
   v
Username + Password
   |
   v
Password hashed using bcrypt
   |
   v
User created
   |
   v
Login
   |
   v
Verify password
   |
   v
JWT generated
   |
   v
Client sends JWT with API requests
   |
   v
JWT Middleware
   |
   v
User authenticated
```

Protected requests use the following header:

```text
Authorization: Bearer <token>
```

The JWT contains:

- User ID
- Username
- User role

The token expires after **1 hour**.

### Free and Premium Users

The rate limiter applies different limits based on the authenticated user's role.

| User Type | Fixed Window Limit |
|---|---|
| Free | 5 requests / 60 seconds |
| Premium | 20 requests / 60 seconds |

The user's role is stored in the JWT and used by the rate limiter to determine the applicable limit.

### Authentication Error Handling

The API handles common authentication failures:

- Missing authorization header → `401`
- Invalid authorization format → `401`
- Missing token → `401`
- Invalid JWT → `401`
- Expired JWT → `401`

Example:

```json
{
  "message": "Invalid token"
}
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login and receive JWT | No |

### Protected APIs

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| GET | `/profile` | Get authenticated user information | JWT |
| GET | `/token-profile` | Test Token Bucket rate limiting | JWT |
| GET | `/stats` | Get rate limiter statistics | No |

### Rate Limit Response

When the rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
```

```json
{
  "message": "Too many requests. Please try again later"
}
```

### Rate Limit Headers

Successful requests include:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 60
```

The limit depends on the authenticated user's role.

### Service Unavailable

If Redis becomes unavailable, the rate limiter returns:

```http
HTTP/1.1 503 Service Unavailable
```

```json
{
  "message": "Rate limiter service temporarily unavailable"
}
```

## Docker Compose

Redis is managed using Docker Compose so the development environment can be started consistently.

### Docker Compose Configuration

The project uses the following Redis service:

```yaml
services:
  redis:
    image: redis:latest
    container_name: rate-limiter-redis
    ports:
      - "6379:6379"
```

### Start Redis

From the project root:

```bash
docker compose up -d
```

Check running containers:

```bash
docker ps
```

### Stop Redis

```bash
docker compose stop redis
```

### Start Redis Again

```bash
docker compose start redis
```

### Redis Connection

The Node.js application connects to Redis using:

```text
redis://localhost:6379
```

Redis provides the shared storage required for:

- Rate-limit counters
- TTL information
- Token Bucket state
- Request statistics

Using Redis as the shared state layer allows multiple Node.js instances to use the same rate-limiting data.

## Load Testing

The API was tested using **Autocannon** to evaluate its behavior under concurrent requests.

### Test Configuration

```bash
autocannon -c 100 -d 10 \
  -H "Authorization=Bearer <JWT_TOKEN>" \
  http://localhost:5000/profile
```

Where:

- `-c 100` → 100 concurrent connections
- `-d 10` → 10-second test
- JWT → authenticated request

### Benchmark Results

A clean 100-concurrent benchmark produced approximately:

| Metric | Result |
|---|---:|
| Concurrent connections | 100 |
| Test duration | 10 seconds |
| Average latency | ~50 ms |
| P99 latency | ~81 ms |
| Average throughput | ~1,980 requests/sec |
| Maximum latency | ~179 ms |

The rate limiter correctly enforced the configured request limit during the test, with requests beyond the allowed limit receiving HTTP `429`.

### Single-Connection Test

A second test was performed with one concurrent connection:

```bash
autocannon -c 1 -d 3 \
  -H "Authorization=Bearer <JWT_TOKEN>" \
  http://localhost:5000/profile
```

Result:

| Metric | Result |
|---|---:|
| Concurrent connections | 1 |
| Test duration | 3 seconds |
| Average latency | ~2.08 ms |
| Average throughput | ~398 requests/sec |
| Successful responses | 5 |
| Rate-limited responses | ~1,190 |

The five successful responses correspond to the configured **5 requests per 60 seconds** limit for a Free user.

These tests demonstrate both API throughput and rate-limit enforcement under concurrent load.

## Project Structure

```text
distributed-rate-limiter/
│
├── dashboard/
│   ├── public/
│   ├── src/
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── src/
│   ├── config/
│   │   └── redis.js
│   │
│   ├── controllers/
│   │   └── statsController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── rateLimiter.js
│   │   └── tokenBucket.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── profileRoutes.js
│   │   └── statsRoutes.js
│   │
│   └── server.js
│
├── .gitignore
├── docker-compose.yml
├── package.json
├── package-lock.json
└── README.md
```

## How to Run the Project

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/distributed-rate-limiter.git
cd distributed-rate-limiter
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
JWT_SECRET=your_secret_key
```

### 4. Start Redis

Make sure Docker Desktop is running, then:

```bash
docker compose up -d
```

Verify Redis is running:

```bash
docker ps
```

### 5. Start the Backend

```bash
npm start
```

The backend will run at:

```text
http://localhost:5000
```

### 6. Start the React Dashboard

Open another terminal:

```bash
cd dashboard
npm install
npm run dev
```

The dashboard will run at:

```text
http://localhost:5173
```

### 7. Test the API

Register a user:

```text
POST /auth/register
```

Login to receive a JWT:

```text
POST /auth/login
```

Use the JWT to access the protected profile endpoint:

```text
GET /profile
```

Test the Token Bucket rate limiter:

```text
GET /token-profile
```

View rate limiter statistics:

```text
GET /stats
```

### Stopping Redis

```bash
docker compose stop
```

To start Redis again:

```bash
docker compose start
```

## Future Improvements

- Persistent user storage using PostgreSQL or MongoDB
- Advanced rate-limiting strategies
- Redis Lua scripts for atomic rate-limit operations
- Real-time monitoring and metrics
- Improved dashboard with charts and request analytics
- Dockerized backend and dashboard services
- Cloud deployment
- Automated CI/CD pipeline
- Comprehensive unit and integration testing