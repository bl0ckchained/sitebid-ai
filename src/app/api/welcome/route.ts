export async function GET(request: Request) {
  const url = new URL(request.url);
  console.log(`Request: ${request.method} ${url.pathname}`);
  return Response.json({ message: "Welcome to the API!" });
}
