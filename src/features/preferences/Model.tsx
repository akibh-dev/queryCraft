import { Panel } from "../../ui";
import styles from "./preferences.module.css";

export function Model({
  version,
  gameVersion,
}: {
  version: string;
  gameVersion: string;
}) {
  return (
    <article className={styles.section}>
      <p>
        QueryCraft {gameVersion} · Model {version}
      </p>
      <Panel className={styles.section}>
        <h2>Virtual tables and sample rows</h2>
        <p>
          Virtual row counts, average widths, and key distributions describe the
          full table. Each puzzle also contains a small set of hand-checked
          rows. The query must return those expected rows, including duplicates,
          for any solution to pass.
        </p>
        <h2>What the planner compares</h2>
        <p>
          The planner compares a sequential scan with single-column B-tree
          lookups on active indexes. It supports equality and half-open numeric
          ranges. Multiple filters are independent. Null comparisons match no
          rows. The model rounds estimated row counts to the nearest whole row.
        </p>
        <p>
          Each run starts with a cold cache and uses 8,192-byte pages. An index
          lookup traverses the tree and fetches scattered data pages. The model
          assumes uniform placement and omits extra range leaf reads.
        </p>
        <h2>How to read the estimates</h2>
        <p>
          A sequential page costs one unit and a random page costs four. Each
          row examined costs another 0.001 units per predicate, with a minimum
          of one predicate charge. Estimated latency is 0.1 ms plus 0.02 ms per
          cost unit. The lowest unrounded cost wins. Ties prefer a scan, then
          index ID order.
        </p>
        <p>
          Each optional index stores the average key width plus eight bytes per
          row, rounded up to whole pages. Write overhead is a separate estimate:
          15 times the combined optional tree heights times the share of inserts
          and updates, expressed as a percentage. Fixed indexes are already part
          of the baseline.
        </p>
        <h2>How stars work</h2>
        <p>
          Correct sample results and every mandatory objective earn one star.
          Meeting every silver objective earns a second star. Meeting every gold
          objective as well earns the third. Hints are always available.
        </p>
      </Panel>
    </article>
  );
}
