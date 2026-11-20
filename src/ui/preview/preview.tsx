import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../styles/base.css";
import {
  BrandMark,
  Button,
  ChoiceField,
  FieldGroup,
  Panel,
  ResetIcon,
} from "../index";
import styles from "./preview.module.css";

function Preview() {
  const [theme, setTheme] = useState("dark");
  const [email, setEmail] = useState(true);
  const [name, setName] = useState(false);
  const [error, setError] = useState(true);
  return (
    <main className={styles.preview} data-theme={theme}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <BrandMark /> QueryCraft
        </div>
        <h1>Interface primitives</h1>
        <Panel className={styles.controls}>
          <FieldGroup legend="Theme">
            <div className={styles.themes}>
              {["dark", "light", "system"].map((value) => (
                <ChoiceField
                  key={value}
                  type="radio"
                  name="theme"
                  label={value[0].toUpperCase() + value.slice(1)}
                  checked={theme === value}
                  onChange={() => setTheme(value)}
                />
              ))}
            </div>
          </FieldGroup>
          <FieldGroup legend="Optional indexes">
            <ChoiceField
              type="checkbox"
              label="users.email"
              checked={email}
              onChange={(event) => setEmail(event.target.checked)}
            />
            <ChoiceField
              type="checkbox"
              label="users.name"
              checked={name}
              onChange={(event) => setName(event.target.checked)}
            />
          </FieldGroup>
          <FieldGroup
            legend="Progress import"
            error={
              error
                ? "Unsupported file format. Choose a JSON progress file."
                : undefined
            }
          >
            <input
              aria-label="Progress file"
              type="file"
              accept="application/json,.json"
              onChange={(event) =>
                setError(
                  !event.target.files?.[0]?.name
                    .toLowerCase()
                    .endsWith(".json"),
                )
              }
            />
          </FieldGroup>
          <div className={styles.actions}>
            <Button
              onClick={() => {
                setEmail(false);
                setName(false);
              }}
            >
              <ResetIcon />
              Reset choices
            </Button>
            <Button
              variant="secondary"
              disabledReason="Run the simulation before submitting."
            >
              Submit solution
            </Button>
          </div>
        </Panel>
      </div>
    </main>
  );
}

const container = document.getElementById("preview");
if (container) createRoot(container).render(<Preview />);
