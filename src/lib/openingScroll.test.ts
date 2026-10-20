import { describe, expect, it, vi } from "vitest";
import { resetOpeningScroll, resetOverlayOpeningScroll } from "./openingScroll";

describe("newly opened surfaces", () => {
  it("starts the surface and nested scrolling content at zero without clearing edits", () => {
    const surface = document.createElement("div");
    const nested = document.createElement("div");
    const input = document.createElement("textarea");
    input.value = "Unsaved work";
    nested.append(input);
    surface.append(nested);
    surface.scrollTop = 800;
    nested.scrollTop = 450;
    resetOpeningScroll(surface);
    expect(surface.scrollTop).toBe(0);
    expect(nested.scrollTop).toBe(0);
    expect(input.value).toBe("Unsaved work");
  });

  it("undoes autofocus scrolling after opening without moving the underlying page", () => {
    const page = document.createElement("main");
    const surface = document.createElement("div");
    document.body.append(page, surface);
    page.scrollTop = 900;
    let afterFocus: FrameRequestCallback | undefined;
    const frame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      afterFocus = callback;
      return 1;
    });
    surface.addEventListener("opening", resetOverlayOpeningScroll);
    surface.dispatchEvent(new Event("opening"));
    surface.scrollTop = 650;
    afterFocus?.(0);
    expect(surface.scrollTop).toBe(0);
    expect(page.scrollTop).toBe(900);
    frame.mockRestore();
    page.remove();
    surface.remove();
  });
});