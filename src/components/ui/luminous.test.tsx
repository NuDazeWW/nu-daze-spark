import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Card } from "./card";
import { Button } from "./button";

describe("luminous shared primitives", () => {
  it("wires every Card into the shared treatment without exposing variant props", () => {
    render(<Card accent="magenta" emphasis="featured" interactive surface="light" data-testid="card">Card</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("sm-lit");
    expect(card.dataset.accent).toBe("magenta");
    expect(card.dataset.emphasis).toBe("featured");
    expect(card.dataset.interactive).toBe("true");
    expect(card.dataset.smCardSurface).toBe("light");
    expect(card.hasAttribute("accent")).toBe(false);
  });

  it("preserves existing data accent and named Dashboard tones", () => {
    render(<><Card data-accent="gold" data-testid="explicit"/><Card className="sm-metric sm-tone-coral" data-testid="existing"/></>);
    expect(screen.getByTestId("explicit").dataset.accent).toBe("gold");
    expect(screen.getByTestId("existing").dataset.accent).toBe("magenta");
  });

  it("uses the same accent surface for normal and asChild actions", () => {
    const onClick = vi.fn();
    render(<><Button accent="violet" onClick={onClick}>Manage</Button><Button accent="gold" asChild><a href="/assets">Import</a></Button></>);
    const button = screen.getByRole("button", {name:"Manage"});
    expect(button.className).toContain("sm-lit-btn");
    expect(button.dataset.accent).toBe("violet");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", {name:"Import"}).dataset.accent).toBe("gold");
  });

  it("retains semantic destructive and disabled states", () => {
    render(<><Button variant="destructive">Remove</Button><Button disabled>Generate</Button></>);
    expect(screen.getByRole("button", {name:"Remove"}).className).toContain("sm-btn-destructive");
    expect(screen.getByRole("button", {name:"Generate"})).toBeDisabled();
  });
});
