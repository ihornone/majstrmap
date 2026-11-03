import { ukraineMapData } from '../components/shadcnmaps/map-data/ukraine';
import type { MapRegionData } from '../components/shadcnmaps/types';

export interface RegionInfo {
  id: string;
  name: string;
  shortName: string;
  labelX: number;
  labelY: number;
  viewBox: string;
  path: string;
}

const REGION_VIEWBOX: Record<string, string> = {
  'kiev-city': '264.2 87.3 39.7 40.1',
  'kiev': '231.3 36.6 117.8 144.4',
  'lviv': '7.1 83.1 114.2 121.1',
  'dnipropetrovsk': '356.4 160.2 154.6 108',
  'odessa': '195.6 209.3 124.5 168.8',
  'kharkiv': '420.6 94 129.5 120.2',
  'ivano-frankivsk': '37.8 141.3 91.2 113.7',
  'vinnytsya': '167.2 124 109.6 113.8',
  'zaporizhzhya': '396.3 213.8 125 122.4',
  'poltava': '326.9 89 135 115.4',
  'cherkasy': '242.8 106.2 131.2 112.1',
  'khmelnytskyy': '125.2 86.8 79.8 131.4',
  'zhytomyr': '161 28.3 106.2 131.7',
  'ternopil': '77.3 104.2 78.5 111.3',
  'rivne': '89.8 13.7 109.2 124.3',
  'volyn': '39.7 12.7 104.6 110.4',
  'transcarpathia': '-10 165.4 104.2 80.9',
  'chernivtsi': '83.9 186.8 108.7 68.1',
  'mykolayiv': '263.3 209.4 120.5 109.4',
  'sumy': '355.8 -9.3 112.6 141.7',
  'chernihiv': '272.6 -9.7 122 129.7',
  'kirovohrad': '247.7 157.5 160.2 96.2',
  'kherson': '315.6 241.2 133.2 109.3',
  'donetsk': '477.6 158 106.3 139.6',
  'luhansk': '521.5 113.6 100.4 136.3',
  'crimea': '340.1 308.9 160.9 108.4',
};

function regionViewBox(id: string): string {
  const viewBox = REGION_VIEWBOX[id];
  if (!viewBox) {
    throw new Error(`Missing viewBox crop for region "${id}" in data/regions.ts`);
  }
  return viewBox;
}

export const REGIONS_DATA: Record<string, RegionInfo> = Object.fromEntries(
  (ukraineMapData.regions as readonly MapRegionData[]).map((region) => [
    region.id,
    {
      id: region.id,
      name: region.name,
      shortName: region.abbreviation ?? region.name,
      labelX: region.labelX ?? 0,
      labelY: region.labelY ?? 0,
      viewBox: regionViewBox(region.id),
      path: region.path,
    } satisfies RegionInfo,
  ])
);
