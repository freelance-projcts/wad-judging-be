"use client";

import { useEffect } from "react";

/**
 * Renders Swagger UI against /openapi/openapi.yaml using the CDN bundle,
 * avoiding an extra swagger-ui-react dependency for a page that's only
 * used by developers.
 */
export default function ApiDocsPage() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.onload = () => {
      // @ts-expect-error - loaded from CDN, no type declarations
      window.SwaggerUIBundle({
        url: "/openapi/openapi.yaml",
        dom_id: "#swagger-ui",
      });
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return <div id="swagger-ui" />;
}
