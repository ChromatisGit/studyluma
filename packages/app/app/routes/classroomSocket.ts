/**
 * The Classroom WebSocket. Server entries upgrade it before the router, so
 * getting here means the runtime has no sockets (the Vite dev server).
 */
export function GET() {
  return new Response(null, { status: 426 });
}
