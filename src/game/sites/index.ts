import type { MissionId } from '../../../shared/types';
import type { Game } from '../engine';
import { LAYOUT } from '../world';
import type { Site } from './base';
import { CommandSite } from './command';
import { GreenhouseSite } from './greenhouse';
import { HabitatSite } from './habitat';
import { SignalSite } from './signal';
import { SolarSite } from './solar';
import { WaterSite } from './water';

export function createSites(game: Game): Record<MissionId, Site> {
  return {
    greenhouse: new GreenhouseSite(game, LAYOUT.greenhouse),
    water: new WaterSite(game, LAYOUT.water),
    darkness: new SolarSite(game, LAYOUT.darkness),
    signal: new SignalSite(game, LAYOUT.signal),
    habitat: new HabitatSite(game, LAYOUT.habitat),
    final: new CommandSite(game, LAYOUT.final),
  };
}
