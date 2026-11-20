import {
  type Fixture,
  type LevelDefinition,
  validateFixture,
  validateLevel,
} from "../domain";
import emailFixture from "./fixtures/w1-l1-needle-in-a-million.json";
import namesFixture from "./fixtures/w1-l2-name-collision.json";
import emailLevel from "./levels/w1-l1-needle-in-a-million.json";
import namesLevel from "./levels/w1-l2-name-collision.json";

export type CampaignEntry = { level: LevelDefinition; fixture: Fixture };

function entry(rawLevel: unknown, rawFixture: unknown): CampaignEntry {
  const level = validateLevel(rawLevel);
  return { level, fixture: validateFixture(level, rawFixture) };
}

export const catalog: readonly CampaignEntry[] = [
  entry(emailLevel, emailFixture),
  entry(namesLevel, namesFixture),
];
export const orderedIds = catalog.map(({ level }) => level.id);
export function findEntry(id: string) {
  return catalog.find(({ level }) => level.id === id);
}
