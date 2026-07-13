export function createClientRequestId() {
  return `request_${crypto.randomUUID()}`;
}
