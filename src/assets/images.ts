// Asset loading system for building images and colonist sprites
import BuildingHouseImg from './BuildingHouse.png';
import WheatStage1Img from './farm/wheat_stage_one.png';
import WheatStage2Img from './farm/wheat_stage_two.png';
import WheatStage3Img from './farm/wheat_stage_three.png';

// Colonist sprite imports
// Heads
import MaleAverageNormalEast from './things/colonist/human-like/heads/Male_Average_Normal_east.png';
import MaleAverageNormalNorth from './things/colonist/human-like/heads/Male_Average_Normal_north.png';
import MaleAverageNormalSouth from './things/colonist/human-like/heads/Male_Average_Normal_south.png';

// Bodies
import NakedMaleEast from './things/colonist/human-like/bodies/Naked_Male_east.png';
import NakedMaleNorth from './things/colonist/human-like/bodies/Naked_Male_north.png';
import NakedMaleSouth from './things/colonist/human-like/bodies/Naked_Male_south.png';

// Hair styles
import AfroEast from './things/colonist/human-like/hair/Afro_east.png';
import AfroNorth from './things/colonist/human-like/hair/Afro_north.png';
import AfroSouth from './things/colonist/human-like/hair/Afro_south.png';
import BobEast from './things/colonist/human-like/hair/Bob_east.png';
import BobNorth from './things/colonist/human-like/hair/Bob_north.png';
import BobSouth from './things/colonist/human-like/hair/Bob_south.png';
import BowlcutEast from './things/colonist/human-like/hair/Bowlcut_east.png';
import BowlcutNorth from './things/colonist/human-like/hair/Bowlcut_north.png';
import BowlcutSouth from './things/colonist/human-like/hair/Bowlcut_south.png';
import BraidbunEast from './things/colonist/human-like/hair/Braidbun_east.png';
import BraidbunNorth from './things/colonist/human-like/hair/Braidbun_north.png';
import BraidbunSouth from './things/colonist/human-like/hair/Braidbun_south.png';
import BravoEast from './things/colonist/human-like/hair/Bravo_east.png';
import BravoNorth from './things/colonist/human-like/hair/Bravo_north.png';
import BravoSouth from './things/colonist/human-like/hair/Bravo_south.png';
import BurgundyEast from './things/colonist/human-like/hair/Burgundy_east.png';
import BurgundyNorth from './things/colonist/human-like/hair/Burgundy_north.png';
import BurgundySouth from './things/colonist/human-like/hair/Burgundy_south.png';
import CleopatraEast from './things/colonist/human-like/hair/Cleopatra_east.png';
import CleopatraNorth from './things/colonist/human-like/hair/Cleopatra_north.png';
import CleopatraSouth from './things/colonist/human-like/hair/Cleopatra_south.png';
import CurlyEast from './things/colonist/human-like/hair/Curly_east.png';
import CurlyNorth from './things/colonist/human-like/hair/Curly_north.png';
import CurlySouth from './things/colonist/human-like/hair/Curly_south.png';
import CuteEast from './things/colonist/human-like/hair/Cute_east.png';
import CuteNorth from './things/colonist/human-like/hair/Cute_north.png';
import CuteSouth from './things/colonist/human-like/hair/Cute_south.png';
import DecentEast from './things/colonist/human-like/hair/Decent_east.png';
import DecentNorth from './things/colonist/human-like/hair/Decent_north.png';
import DecentSouth from './things/colonist/human-like/hair/Decent_south.png';
import ElderEast from './things/colonist/human-like/hair/Elder_east.png';
import ElderNorth from './things/colonist/human-like/hair/Elder_north.png';
import ElderSouth from './things/colonist/human-like/hair/Elder_south.png';
import FancybunEast from './things/colonist/human-like/hair/Fancybun_east.png';
import FancybunNorth from './things/colonist/human-like/hair/Fancybun_north.png';
import FancybunSouth from './things/colonist/human-like/hair/Fancybun_south.png';
import FirestarterEast from './things/colonist/human-like/hair/Firestarter_east.png';
import FirestarterNorth from './things/colonist/human-like/hair/Firestarter_north.png';
import FirestarterSouth from './things/colonist/human-like/hair/Firestarter_south.png';
import FlowyEast from './things/colonist/human-like/hair/Flowy_east.png';
import FlowyNorth from './things/colonist/human-like/hair/Flowy_north.png';
import FlowySouth from './things/colonist/human-like/hair/Flowy_south.png';
import FringeEast from './things/colonist/human-like/hair/Fringe_east.png';
import FringeNorth from './things/colonist/human-like/hair/Fringe_north.png';
import FringeSouth from './things/colonist/human-like/hair/Fringe_south.png';

// Apparel
import ShirtBasicMaleEast from './things/colonist/human-like/apperal/ShirtBasic/ShirtBasic_Male_east.png';
import ShirtBasicMaleNorth from './things/colonist/human-like/apperal/ShirtBasic/ShirtBasic_Male_north.png';
import ShirtBasicMaleSouth from './things/colonist/human-like/apperal/ShirtBasic/ShirtBasic_Male_south.png';

// Weapons - Ranged
import AssaultRifle from './things/item/equipment/weapon-ranged/AssaultRifle.png';
import Autopistol from './things/item/equipment/weapon-ranged/Autopistol.png';
import Revolver from './things/item/equipment/weapon-ranged/Revolver.png';
import Shotgun from './things/item/equipment/weapon-ranged/Shotgun.png';
import SniperRifle from './things/item/equipment/weapon-ranged/SniperRifle.png';

// Weapons - Melee
import Club from './things/item/equipment/weapon-melee/Club.png';
import Knife from './things/item/equipment/weapon-melee/Knife.png';

export class ImageAssets {
  private static instance: ImageAssets;
  private images: Map<string, HTMLImageElement> = new Map();
  private loaded: boolean = false;

  static getInstance(): ImageAssets {
    if (!ImageAssets.instance) {
      ImageAssets.instance = new ImageAssets();
    }
    return ImageAssets.instance;
  }

  async loadAssets(): Promise<void> {
    const buildingAssets = [
      { name: 'house', path: BuildingHouseImg },
      { name: 'wheat_stage_1', path: WheatStage1Img },
      { name: 'wheat_stage_2', path: WheatStage2Img },
      { name: 'wheat_stage_3', path: WheatStage3Img }
    ];

    const colonistAssets = [
      // Heads
      { name: 'head_male_average_normal_east', path: MaleAverageNormalEast },
      { name: 'head_male_average_normal_north', path: MaleAverageNormalNorth },
      { name: 'head_male_average_normal_south', path: MaleAverageNormalSouth },
      
      // Bodies
      { name: 'body_naked_male_east', path: NakedMaleEast },
      { name: 'body_naked_male_north', path: NakedMaleNorth },
      { name: 'body_naked_male_south', path: NakedMaleSouth },
      
      // Hair styles
      { name: 'hair_afro_east', path: AfroEast },
      { name: 'hair_afro_north', path: AfroNorth },
      { name: 'hair_afro_south', path: AfroSouth },
      { name: 'hair_bob_east', path: BobEast },
      { name: 'hair_bob_north', path: BobNorth },
      { name: 'hair_bob_south', path: BobSouth },
      { name: 'hair_bowlcut_east', path: BowlcutEast },
      { name: 'hair_bowlcut_north', path: BowlcutNorth },
      { name: 'hair_bowlcut_south', path: BowlcutSouth },
      { name: 'hair_braidbun_east', path: BraidbunEast },
      { name: 'hair_braidbun_north', path: BraidbunNorth },
      { name: 'hair_braidbun_south', path: BraidbunSouth },
      { name: 'hair_bravo_east', path: BravoEast },
      { name: 'hair_bravo_north', path: BravoNorth },
      { name: 'hair_bravo_south', path: BravoSouth },
      { name: 'hair_burgundy_east', path: BurgundyEast },
      { name: 'hair_burgundy_north', path: BurgundyNorth },
      { name: 'hair_burgundy_south', path: BurgundySouth },
      { name: 'hair_cleopatra_east', path: CleopatraEast },
      { name: 'hair_cleopatra_north', path: CleopatraNorth },
      { name: 'hair_cleopatra_south', path: CleopatraSouth },
      { name: 'hair_curly_east', path: CurlyEast },
      { name: 'hair_curly_north', path: CurlyNorth },
      { name: 'hair_curly_south', path: CurlySouth },
      { name: 'hair_cute_east', path: CuteEast },
      { name: 'hair_cute_north', path: CuteNorth },
      { name: 'hair_cute_south', path: CuteSouth },
      { name: 'hair_decent_east', path: DecentEast },
      { name: 'hair_decent_north', path: DecentNorth },
      { name: 'hair_decent_south', path: DecentSouth },
      { name: 'hair_elder_east', path: ElderEast },
      { name: 'hair_elder_north', path: ElderNorth },
      { name: 'hair_elder_south', path: ElderSouth },
      { name: 'hair_fancybun_east', path: FancybunEast },
      { name: 'hair_fancybun_north', path: FancybunNorth },
      { name: 'hair_fancybun_south', path: FancybunSouth },
      { name: 'hair_firestarter_east', path: FirestarterEast },
      { name: 'hair_firestarter_north', path: FirestarterNorth },
      { name: 'hair_firestarter_south', path: FirestarterSouth },
      { name: 'hair_flowy_east', path: FlowyEast },
      { name: 'hair_flowy_north', path: FlowyNorth },
      { name: 'hair_flowy_south', path: FlowySouth },
      { name: 'hair_fringe_east', path: FringeEast },
      { name: 'hair_fringe_north', path: FringeNorth },
      { name: 'hair_fringe_south', path: FringeSouth },
      
      // Apparel
      { name: 'apparel_shirt_basic_male_east', path: ShirtBasicMaleEast },
      { name: 'apparel_shirt_basic_male_north', path: ShirtBasicMaleNorth },
      { name: 'apparel_shirt_basic_male_south', path: ShirtBasicMaleSouth }
    ];

    const weaponAssets = [
      // Ranged weapons
      { name: 'weapon_assault_rifle', path: AssaultRifle },
      { name: 'weapon_autopistol', path: Autopistol },
      { name: 'weapon_revolver', path: Revolver },
      { name: 'weapon_shotgun', path: Shotgun },
      { name: 'weapon_sniper_rifle', path: SniperRifle },
      
      // Melee weapons
      { name: 'weapon_club', path: Club },
      { name: 'weapon_knife', path: Knife }
    ];

    const allAssets = [...buildingAssets, ...colonistAssets, ...weaponAssets];
    const loadPromises = allAssets.map(asset => this.loadImage(asset.name, asset.path));
    
    try {
      await Promise.all(loadPromises);
      this.loaded = true;
    } catch (error) {
      console.warn('Some assets failed to load, continuing with fallbacks');
      this.loaded = true; // Still mark as loaded to prevent blocking
    }
  }

  private loadImage(name: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(name, img);
        console.log(`Loaded image: ${name}`);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${name} from ${path}`);
        reject(new Error(`Failed to load ${name}`));
      };
      img.src = path;
    });
  }

  getImage(name: string): HTMLImageElement | null {
    return this.images.get(name) || null;
  }

  // Helper method to get colonist sprite components
  getColonistSprite(component: string, variant: string, direction: string): HTMLImageElement | null {
    const spriteName = `${component}_${variant}_${direction}`;
    return this.images.get(spriteName) || null;
  }

  // Get all available hair styles (only the ones we've imported so far)
  getAvailableHairStyles(): string[] {
    return ['afro', 'bob', 'bowlcut', 'braidbun', 'bravo', 'burgundy', 'cleopatra', 
            'curly', 'cute', 'decent', 'elder', 'fancybun', 'firestarter', 'flowy', 'fringe'];
  }

  // Get all available head types
  getAvailableHeadTypes(): string[] {
    return ['male_average_normal'];
  }

  // Get all available body types
  getAvailableBodyTypes(): string[] {
    return ['naked_male'];
  }

  // Get all available apparel types
  getAvailableApparelTypes(): string[] {
    return ['shirt_basic_male'];
  }

  // Get weapon image by defName (matches itemDatabase defName format)
  getWeaponImage(defName: string): HTMLImageElement | null {
    // Map defName to asset name
    const weaponMap: Record<string, string> = {
      // Ranged weapons
      'Autopistol': 'weapon_autopistol',
      'AssaultRifle': 'weapon_assault_rifle',
      'SniperRifle': 'weapon_sniper_rifle',
      'SMG': 'weapon_autopistol',              // SMG uses Autopistol sprite (smaller weapon)
      'Revolver': 'weapon_revolver',
      'Shotgun': 'weapon_shotgun',
      
      // Melee weapons
      'Club': 'weapon_club',
      'Knife': 'weapon_knife'
    };
    
    const assetName = weaponMap[defName];
    return assetName ? this.images.get(assetName) || null : null;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
