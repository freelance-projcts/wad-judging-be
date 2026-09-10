/**
 * k6 load test for the WAD Judging System.
 *
 * Simulates the mix of traffic the app sees during a live competition:
 *   - Admins/judges signing in
 *   - Judges browsing students and submitting marks
 *   - Everyone polling results
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:3000 -e JUDGE_EMAIL=judge@wadjudging.test \
 *          -e JUDGE_PASSWORD=Judge@12345 load-testing/k6-scenario.js
 *
 * See docs/load-testing.md for scenario rationale and target thresholds.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const JUDGE_EMAIL = __ENV.JUDGE_EMAIL || "judge@wadjudging.test";
const JUDGE_PASSWORD = __ENV.JUDGE_PASSWORD || "Judge@12345";

export const options = {
  scenarios: {
    ramping_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 150 }, // warm up
        { duration: "2m", target: 500 }, // target: 500 concurrent users
        { duration: "3m", target: 500 }, // sustain
        { duration: "1m", target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% errors
    http_req_duration: ["p(95)<800", "p(99)<2000"],
  },
};

export default function () {
  const jar = http.cookieJar();

  // 1. Sign in
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: JUDGE_EMAIL, password: JUDGE_PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(loginRes, { "login succeeded": (r) => r.status === 200 });

  sleep(1);

  // 2. Load session + assigned performances
  const meRes = http.get(`${BASE_URL}/api/auth/me`);
  check(meRes, { "session loaded": (r) => r.status === 200 });

  let performanceId;
  try {
    performanceId = JSON.parse(meRes.body).performances?.[0]?.id;
  } catch {
    performanceId = null;
  }

  sleep(1);

  // 3. Browse/search students (typical marks-entry-page traffic)
  const studentsRes = http.get(`${BASE_URL}/api/students?gender=MALE&province=WESTERN`);
  check(studentsRes, { "students loaded": (r) => r.status === 200 });

  sleep(1);

  // 4. Fetch results for the performance (read-heavy path during live judging)
  if (performanceId) {
    const eventsRes = http.get(`${BASE_URL}/api/events`);
    let eventId;
    try {
      eventId = JSON.parse(eventsRes.body).events?.[0]?.id;
    } catch {
      eventId = null;
    }
    if (eventId) {
      const resultsRes = http.get(
        `${BASE_URL}/api/results?performanceId=${performanceId}&view=top8&eventId=${eventId}`
      );
      check(resultsRes, { "results loaded": (r) => r.status === 200 });
    }
  }

  sleep(2);
  jar.clear(BASE_URL);
}
