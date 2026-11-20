import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Button, ChoiceField, FieldGroup } from "./controls";

it("keeps the existing description alongside the disabled reason", () => {
  const html = renderToStaticMarkup(
    <Button
      aria-describedby="instructions"
      disabledReason="Run the simulation first."
    >
      Submit solution
    </Button>,
  );
  const reasonId = html.match(/aria-describedby="instructions ([^"]+)"/)?.[1];
  expect(reasonId).toBeTruthy();
  expect(html).toContain('disabled=""');
  expect(html).toContain(`id="${reasonId}"`);
  expect(html).toContain("Run the simulation first.</span>");
});

it("associates the fieldset with its description and inline error", () => {
  const html = renderToStaticMarkup(
    <FieldGroup
      legend="Indexes"
      description="Choose an index."
      error="Unknown column."
    >
      <ChoiceField type="checkbox" label="books.title" defaultChecked />
    </FieldGroup>,
  );
  const ids = html.match(/aria-describedby="([^"]+)"/)?.[1].split(" ");
  expect(ids).toHaveLength(2);
  expect(html).toContain(`id="${ids?.[0]}">Choose an index.`);
  expect(html).toContain(`id="${ids?.[1]}">Unknown column.`);
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain("<legend>Indexes</legend>");
});
