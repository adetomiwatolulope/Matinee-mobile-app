import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const holdEndpoint = __ENV.MATINEE_HOLD_ENDPOINT;
const showtimeId = __ENV.MATINEE_SHOWTIME_ID;
const authToken = __ENV.MATINEE_AUTH_TOKEN;
const virtualUsers = Number(__ENV.MATINEE_VUS || 500);
const seatCount = Number(__ENV.MATINEE_SEAT_COUNT || 50);
const seatPrefix = __ENV.MATINEE_SEAT_PREFIX || 'S';
const duration = __ENV.MATINEE_MAX_DURATION || '60s';

if (!holdEndpoint) throw new Error('MATINEE_HOLD_ENDPOINT is required');
if (!showtimeId) throw new Error('MATINEE_SHOWTIME_ID is required');

const successfulHolds = new Counter('holds_successful');
const thresholds = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<2000'],
};

function seatId(index) {
  return `${seatPrefix}${index + 1}`;
}

for (let index = 0; index < seatCount; index += 1) {
  thresholds[`holds_successful{seat:${seatId(index)}}`] = ['count<=1'];
}

export const options = {
  scenarios: {
    simultaneous_holds: {
      executor: 'per-vu-iterations',
      vus: virtualUsers,
      iterations: 1,
      maxDuration: duration,
      gracefulStop: '0s',
    },
  },
  thresholds,
};

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 409, 423, 429));

export default function executeHoldContention() {
  const seatIndex = (__VU - 1) % seatCount;
  const selectedSeatId = seatId(seatIndex);
  const idempotencyKey = `hold-contention-${__VU}-${__ITER}`;
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  };

  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = http.post(
    holdEndpoint,
    JSON.stringify({
      showtimeId,
      seatIds: [selectedSeatId],
      idempotencyKey,
    }),
    {
      headers,
      tags: {
        scenario: 'hold-contention',
        seat: selectedSeatId,
      },
    },
  );
  const accepted = response.status === 200 || response.status === 201;
  const controlledRejection = response.status === 409 || response.status === 423 || response.status === 429;

  check(response, {
    'hold is accepted or explicitly rejected': () => accepted || controlledRejection,
    'request id returned': () => Boolean(response.headers['X-Request-Id']),
  });

  if (accepted) successfulHolds.add(1, { seat: selectedSeatId });
}

export function handleSummary(data) {
  const report = JSON.stringify(data.metrics, null, 2);
  return {
    stdout: report,
    'tests/load/hold-contention-summary.json': report,
  };
}
