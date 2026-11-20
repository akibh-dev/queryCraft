import { Component, type ReactNode } from "react";
import { Button } from "../ui";

export class PageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section aria-label="Page recovery">
        <p role="alert">
          This page could not load its puzzle data. You can retry or return to
          the level map.
        </p>
        <Button onClick={() => this.setState({ failed: false })}>Retry</Button>{" "}
        <a href="/levels">Back to levels</a>
      </section>
    );
  }
}
