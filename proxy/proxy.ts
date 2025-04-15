const PORT = process.env.PORT || 5006;
const ELECTRIC_URL =
  process.env.ELECTRIC_URL || "https://api.electric-sql.cloud";

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    try {
      const requestUrl = new URL(request.url);

      // Only handle GET requests to the /api/shape path
      if (
        request.method !== "GET" ||
        !requestUrl.pathname.startsWith("/api/shape")
      ) {
        return new Response("Not Found", {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      // Handle OPTIONS requests for CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      const originUrl = new URL(`${ELECTRIC_URL}/v1/shape`);

      // Copy over search parameters from the incoming request
      requestUrl.searchParams.forEach((value, key) => {
        originUrl.searchParams.set(key, value);
      });

      // Add source ID if available
      if (process.env.VITE_ELECTRIC_SOURCE_ID) {
        originUrl.searchParams.set(
          "source_id",
          process.env.VITE_ELECTRIC_SOURCE_ID,
        );
      }

      // Add source secret if available
      if (process.env.VITE_ELECTRIC_SOURCE_ID) {
        originUrl.searchParams.set(
          "source_secret",
          process.env.VITE_ELECTRIC_SOURCE_ID,
        );
      }

      // Create headers object for the outgoing request
      const headers = new Headers();

      // Perform the fetch request to the target URL
      const resp = await fetch(originUrl.toString(), {
        method: "GET",
        headers,
      });

      console.log("resp", resp);

      // Handle content-encoding issues by copying response and removing problematic headers
      if (resp.headers.get("content-encoding")) {
        const newHeaders = new Headers(resp.headers);
        newHeaders.delete("content-encoding");
        newHeaders.delete("content-length");

        // Add CORS headers
        newHeaders.set("Access-Control-Allow-Origin", "*");
        newHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        newHeaders.set("Access-Control-Allow-Headers", "Content-Type");

        // Return a new response with fixed headers
        return new Response(resp.body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: newHeaders,
        });
      }

      // Add CORS headers to the original response
      const corsHeaders = new Headers(resp.headers);
      corsHeaders.set("Access-Control-Allow-Origin", "*");
      corsHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      corsHeaders.set("Access-Control-Allow-Headers", "Content-Type");

      // Return the response with CORS headers
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("Error handling request:", error);
      return new Response("Internal Server Error", {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
  },
});

console.log(`Proxy server running at http://localhost:${PORT}`);
console.log(`Proxying requests to ${ELECTRIC_URL}`);
