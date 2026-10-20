import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SetupChecklist } from "./SetupChecklist";
import { useWorkspace } from "@/hooks/useWorkspace";

vi.mock("@/hooks/useWorkspace", () => ({
  SETUP_STEPS: [
    { key: "company", title: "Company profile" },
    { key: "org_type", title: "Organization type" },
    { key: "first_entity", title: "First client or department" },
    { key: "brand_voice", title: "Brand voice basics" },
    { key: "cadence", title: "Cadence targets" },
    { key: "team", title: "Invite your team" },
    { key: "ai_tools", title: "AI image & video tools" },
    { key: "email", title: "Email provider" },
  ],
  useWorkspace: vi.fn(),
}));

const mockedUseWorkspace = vi.mocked(useWorkspace);

function renderChecklist(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SetupChecklist />
    </MemoryRouter>,
  );
}

describe("SetupChecklist", () => {
  beforeEach(() => {
    mockedUseWorkspace.mockReturnValue({
      canManage: true,
      settings: {},
      progress: { company: true },
      setupCompleted: 1,
      setupTotal: 8,
    } as unknown as ReturnType<typeof useWorkspace>);
  });

  it("renders all eight links with their actual setup-step URLs", () => {
    renderChecklist("/");

    for (const key of ["company", "org_type", "first_entity", "brand_voice", "cadence", "team", "ai_tools", "email"]) {
      expect(document.querySelector(`a[href="/setup?step=${key}"]`)).not.toBeNull();
    }
  });

  it("uses the current setup query only for selection and keeps completion truthful", () => {
    renderChecklist("/setup?step=ai_tools");

    const selected = screen.getByRole("link", { name: /AI image & video tools/i });
    expect(selected.getAttribute("aria-current")).toBe("step");
    expect(selected.getAttribute("data-selected")).toBe("true");

    const incomplete = screen.getByTitle("AI image & video tools: incomplete");
    expect(incomplete.getAttribute("data-state")).toBe("incomplete");
    expect(incomplete.querySelector("svg")?.getAttribute("class")).toContain("lucide-circle");
    expect(screen.getByText("AI image & video tools: incomplete")).not.toBeNull();

    const complete = screen.getByTitle("Company profile: complete");
    expect(complete.getAttribute("data-state")).toBe("complete");
    expect(complete.querySelector("svg")?.getAttribute("class")).toContain("lucide-circle-check");
  });

  it("does not infer a selected step from incomplete progress on the Dashboard", () => {
    renderChecklist("/");

    const firstIncomplete = screen.getByRole("link", { name: /Organization type/i });
    expect(firstIncomplete.getAttribute("aria-current")).toBeNull();
    expect(firstIncomplete.getAttribute("data-selected")).toBeNull();
  });
});
