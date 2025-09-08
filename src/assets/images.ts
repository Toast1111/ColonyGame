// Asset loading system for building images and colonist sprites
import BuildingHouseImg from './BuildingHouse.png';
import WheatStage1Img from './farm/wheat_stage_one.png';
import WheatStage2Img from './farm/wheat_stage_two.png';
import WheatStage3Img from './farm/wheat_stage_three.png';

// Colonist sprite imports
// Heads
import MaleAverageNormalEast from './colonist/heads/Male_Average_Normal_east.png';
import MaleAverageNormalNorth from './colonist/heads/Male_Average_Normal_north.png';
import MaleAverageNormalSouth from './colonist/heads/Male_Average_Normal_south.png';

// Bodies
import NakedMaleEast from './colonist/bodies/Naked_Male_east.png';
import NakedMaleNorth from './colonist/bodies/Naked_Male_north.png';
import NakedMaleSouth from './colonist/bodies/Naked_Male_south.png';

// Hair styles
import AfroEast from './colonist/hair/Afro_east.png';
import AfroNorth from './colonist/hair/Afro_north.png';
import AfroSouth from './colonist/hair/Afro_south.png';
import BobEast from './colonist/hair/Bob_east.png';
import BobNorth from './colonist/hair/Bob_north.png';
import BobSouth from './colonist/hair/Bob_south.png';
import BowlcutEast from './colonist/hair/Bowlcut_east.png';
import BowlcutNorth from './colonist/hair/Bowlcut_north.png';
import BowlcutSouth from './colonist/hair/Bowlcut_south.png';
import BraidbunEast from './colonist/hair/Braidbun_east.png';
import BraidbunNorth from './colonist/hair/Braidbun_north.png';
import BraidbunSouth from './colonist/hair/Braidbun_south.png';
import BravoEast from './colonist/hair/Bravo_east.png';
import BravoNorth from './colonist/hair/Bravo_north.png';
import BravoSouth from './colonist/hair/Bravo_south.png';
import BurgundyEast from './colonist/hair/Burgundy_east.png';
import BurgundyNorth from './colonist/hair/Burgundy_north.png';
import BurgundySouth from './colonist/hair/Burgundy_south.png';
import CleopatraEast from './colonist/hair/Cleopatra_east.png';
import CleopatraNorth from './colonist/hair/Cleopatra_north.png';
import CleopatraSouth from './colonist/hair/Cleopatra_south.png';
import CurlyEast from './colonist/hair/Curly_east.png';
import CurlyNorth from './colonist/hair/Curly_north.png';
import CurlySouth from './colonist/hair/Curly_south.png';
import CuteEast from './colonist/hair/Cute_east.png';
import CuteNorth from './colonist/hair/Cute_north.png';
import CuteSouth from './colonist/hair/Cute_south.png';
import DecentEast from './colonist/hair/Decent_east.png';
import DecentNorth from './colonist/hair/Decent_north.png';
import DecentSouth from './colonist/hair/Decent_south.png';
import ElderEast from './colonist/hair/Elder_east.png';
import ElderNorth from './colonist/hair/Elder_north.png';
import ElderSouth from './colonist/hair/Elder_south.png';
import FancybunEast from './colonist/hair/Fancybun_east.png';
import FancybunNorth from './colonist/hair/Fancybun_north.png';
import FancybunSouth from './colonist/hair/Fancybun_south.png';
import FirestarterEast from './colonist/hair/Firestarter_east.png';
import FirestarterNorth from './colonist/hair/Firestarter_north.png';
import FirestarterSouth from './colonist/hair/Firestarter_south.png';
import FlowyEast from './colonist/hair/Flowy_east.png';
import FlowyNorth from './colonist/hair/Flowy_north.png';
import FlowySouth from './colonist/hair/Flowy_south.png';
import FringeEast from './colonist/hair/Fringe_east.png';
import FringeNorth from './colonist/hair/Fringe_north.png';
import FringeSouth from './colonist/hair/Fringe_south.png';

// Missing hair styles - let me check what other ones exist
// For now, let's work with what we have and add more gradually

// Apparel
import ShirtBasicMaleEast from './colonist/apperal/ShirtBasic/ShirtBasic_Male_east.png';
import ShirtBasicMaleNorth from './colonist/apperal/ShirtBasic/ShirtBasic_Male_north.png';
import ShirtBasicMaleSouth from './colonist/apperal/ShirtBasic/ShirtBasic_Male_south.png';

// Item/Equipment icons (weapons)
import WeaponAutopistol from './item/equipment/weapon_ranged/Autopistol.png';
import WeaponRevolver from './item/equipment/weapon_ranged/Revolver.png';
import WeaponMachinePistol from './item/equipment/weapon_ranged/MachinePistol.png';
import WeaponHeavySMG from './item/equipment/weapon_ranged/HeavySMG.png';
import WeaponLMG from './item/equipment/weapon_ranged/LMG.png';
import WeaponMinigun from './item/equipment/weapon_ranged/Minigun.png';
import WeaponAssaultRifle from './item/equipment/weapon_ranged/AssaultRifle.png';
import WeaponBoltActionRifle from './item/equipment/weapon_ranged/BoltActionRifle.png';
import WeaponSniperRifle from './item/equipment/weapon_ranged/SniperRifle.png';
import WeaponShotgun from './item/equipment/weapon_ranged/Shotgun.png';
import WeaponChainShotgun from './item/equipment/weapon_ranged/ChainShotgun.png';
import WeaponRocketLauncher from './item/equipment/weapon_ranged/RocketLauncher.png';
import WeaponThumpCannon from './item/equipment/weapon_ranged/ThumpCannon.png';
import WeaponBowShort from './item/equipment/weapon_ranged/BowShort.png';
import WeaponBowRecurve from './item/equipment/weapon_ranged/BowRecurve.png';
import WeaponBowGreat from './item/equipment/weapon_ranged/BowGreat.png';

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

    const equipmentAssets = [
      // Weapons
      { name: 'weapon_autopistol', path: WeaponAutopistol },
      { name: 'weapon_revolver', path: WeaponRevolver },
      { name: 'weapon_machinepistol', path: WeaponMachinePistol },
      { name: 'weapon_heavysmg', path: WeaponHeavySMG },
      { name: 'weapon_lmg', path: WeaponLMG },
      { name: 'weapon_minigun', path: WeaponMinigun },
      { name: 'weapon_assaultrifle', path: WeaponAssaultRifle },
      { name: 'weapon_boltactionrifle', path: WeaponBoltActionRifle },
      { name: 'weapon_sniperrifle', path: WeaponSniperRifle },
      { name: 'weapon_shotgun', path: WeaponShotgun },
      { name: 'weapon_chainshotgun', path: WeaponChainShotgun },
      { name: 'weapon_rocketlauncher', path: WeaponRocketLauncher },
      { name: 'weapon_thumpcannon', path: WeaponThumpCannon },
      { name: 'weapon_bowshort', path: WeaponBowShort },
      { name: 'weapon_bowrecurve', path: WeaponBowRecurve },
      { name: 'weapon_bowgreat', path: WeaponBowGreat }
    ];

    const allAssets = [...buildingAssets, ...colonistAssets, ...equipmentAssets];
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

  // Map item defNames to available icon keys
  private getItemIconKey(defName: string): string | null {
    // Normalize defName for mapping
    const key = defName.toLowerCase();
    switch (key) {
      case 'pistol': // fall back to autopistol art
      case 'autopistol':
        return 'weapon_autopistol';
      case 'revolver':
        return 'weapon_revolver';
      case 'machinepistol':
        return 'weapon_machinepistol';
      case 'heavysmg':
        return 'weapon_heavysmg';
      case 'lmg':
        return 'weapon_lmg';
      case 'minigun':
        return 'weapon_minigun';
      case 'assaultrifle':
      case 'rifle':
        return 'weapon_assaultrifle';
      case 'boltactionrifle':
        return 'weapon_boltactionrifle';
      case 'sniperrifle':
        return 'weapon_sniperrifle';
      case 'shotgun':
        return 'weapon_shotgun';
      case 'chainshotgun':
        return 'weapon_chainshotgun';
      case 'rocketlauncher':
        return 'weapon_rocketlauncher';
      case 'thumpcannon':
        return 'weapon_thumpcannon';
      case 'bowshort':
        return 'weapon_bowshort';
      case 'bowrecurve':
        return 'weapon_bowrecurve';
      case 'bowgreat':
        return 'weapon_bowgreat';
      default:
        return null;
    }
  }

  // Public helper to retrieve an item icon for UI by item defName
  getItemIcon(defName?: string | null): HTMLImageElement | null {
    if (!defName) return null;
    const iconKey = this.getItemIconKey(defName);
    return iconKey ? (this.images.get(iconKey) || null) : null;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
