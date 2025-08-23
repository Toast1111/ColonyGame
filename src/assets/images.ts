// Asset loading system for building images
import BuildingHouseImg from './BuildingHouse.png';
import WheatStage1Img from './farm/wheat_stage_one.png';
import WheatStage2Img from './farm/wheat_stage_two.png';
import WheatStage3Img from './farm/wheat_stage_three.png';

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
    const assets = [
      { name: 'house', path: BuildingHouseImg },
      { name: 'wheat_stage_1', path: WheatStage1Img },
      { name: 'wheat_stage_2', path: WheatStage2Img },
      { name: 'wheat_stage_3', path: WheatStage3Img }
    ];

    const loadPromises = assets.map(asset => this.loadImage(asset.name, asset.path));
    
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

  isLoaded(): boolean {
    return this.loaded;
  }
}
