import http from 'k6/http';
import { check } from 'k6';

const searchEndpoint = __ENV.MATINEE_SEARCH_ENDPOINT || 'http://127.0.0.1:3001/movies/search';
const authToken = __ENV.MATINEE_AUTH_TOKEN;
const query = __ENV.MATINEE_SEARCH_QUERY || 'action';
const virtualUsers = Number(__ENV.MATINEE_VUS || 500);
const duration = __ENV.MATINEE_MAX_DURATION || '60s';

if (!authToken) throw new Error('MATINEE_AUTH_TOKEN is required');

export const options = {
  scenarios: {
    search_surge: {
      executor: 'constant-vus',
      vus: virtualUsers,
      duration,
      gracefulStop: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.95'],
  },
};

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 429, 503));

export default function executeSearchSurge() {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const response = http.get(
    `${searchEndpoint}?q=${encodeURIComponent(query)}&page=1`,
    {
      headers,
      tags: {
        scenario: 'search-surge',
      },
    },
  );

  check(response, {
    'search is served or explicitly rate limited': () => response.status === 200 || response.status === 429 || response.status === 503,
    'request id returned': () => Boolean(response.headers['X-Request-Id']),
  });
}

export function handleSummary(data) {
  const report = JSON.stringify(data.metrics, null, 2);
  return {
    stdout: report,
    'tests/load/search-surge-summary.json': report,
  };
}
