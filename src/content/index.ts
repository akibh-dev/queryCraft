import {
  campaignSchema,
  type Fixture,
  type LevelDefinition,
  validateFixture,
  validateLevel,
} from "../domain";
import emailFixture from "./fixtures/w1-l1-needle-in-a-million.json";
import namesFixture from "./fixtures/w1-l2-name-collision.json";
import directoryFixture from "./fixtures/w1-l3-pocket-directory.json";
import rangeFixture from "./fixtures/w1-l4-range-runner.json";
import commonFixture from "./fixtures/w1-l5-the-common-case.json";
import priceFixture from "./fixtures/w1-l6-price-of-an-index.json";
import emailLevel from "./levels/w1-l1-needle-in-a-million.json";
import namesLevel from "./levels/w1-l2-name-collision.json";

import directoryLevel from "./levels/w1-l3-pocket-directory.json";
import rangeLevel from "./levels/w1-l4-range-runner.json";
import commonLevel from "./levels/w1-l5-the-common-case.json";
import priceLevel from "./levels/w1-l6-price-of-an-index.json";

export type CampaignEntry = { level: LevelDefinition; fixture: Fixture };

function entry(rawLevel: unknown, rawFixture: unknown): CampaignEntry {
  const level = validateLevel(rawLevel);
  return { level, fixture: validateFixture(level, rawFixture) };
}

export const catalog: readonly CampaignEntry[] = [
  entry(emailLevel, emailFixture),
  entry(namesLevel, namesFixture),
  entry(directoryLevel, directoryFixture),
  entry(rangeLevel, rangeFixture),
  entry(commonLevel, commonFixture),
  entry(priceLevel, priceFixture),
];
export const orderedIds = campaignSchema.parse(
  catalog.map(({ level }) => level.id),
);
export function findEntry(id: string) {
  return catalog.find(({ level }) => level.id === id);
}
