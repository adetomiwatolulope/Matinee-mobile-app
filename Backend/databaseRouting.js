const PRIMARY_READ_HEADER = 'x-matinee-read-consistency';
const PRIMARY_READ_TTL_HEADER = 'x-matinee-primary-read-ttl-seconds';
const REQUEST_ID_HEADER = 'x-request-id';

function clientPrimaryReadHeader(ttlSeconds) {
  return {
    [PRIMARY_READ_HEADER]: 'primary',
    [PRIMARY_READ_TTL_HEADER]: String(ttlSeconds),
  };
}

function markPrimaryRead(res, ttlSeconds) {
  const headers = clientPrimaryReadHeader(ttlSeconds);
  res.set(PRIMARY_READ_HEADER, headers[PRIMARY_READ_HEADER]);
  res.set(PRIMARY_READ_TTL_HEADER, headers[PRIMARY_READ_TTL_HEADER]);
}

module.exports = {
  PRIMARY_READ_HEADER,
  PRIMARY_READ_TTL_HEADER,
  REQUEST_ID_HEADER,
  clientPrimaryReadHeader,
  markPrimaryRead,
};
