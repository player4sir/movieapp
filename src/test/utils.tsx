import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

// Custom render function that can include providers
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Add any provider props here if needed
}

function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): ReturnType<typeof render> {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";

// Override render method
export { customRender as render };
