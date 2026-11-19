import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { App } from "./App";

it("renders the application landmark and title", () => {
  expect(renderToStaticMarkup(<App />)).toContain("<main><h1>QueryCraft</h1>");
});
