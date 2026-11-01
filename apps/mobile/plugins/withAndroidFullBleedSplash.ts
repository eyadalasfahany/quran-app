import { generateImageAsync } from '@expo/image-utils';
import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidColors,
  withAndroidStyles,
  withDangerousMod,
} from 'expo/config-plugins';
import fs from 'fs/promises';
import path from 'path';

/** Android 12+ splash: full-bleed poster (cover), not the circular icon mark. */
const SPLASH_STYLE = { name: 'Theme.App.SplashScreen', parent: 'Theme.SplashScreen' };
const FULL_BLEED_DRAWABLE = '@drawable/splashscreen_full';
const EMPTY_ICON_DRAWABLE = '@drawable/splashscreen_icon_empty';
const IMAGE_FILE = 'splashscreen_full_image.png';
const CACHE = 'taybah-android-splash';

/** 1×1 transparent PNG. */
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Portrait / landscape dp baseline (× density multiplier → px). */
const PHONE_PORTRAIT = { width: 360, height: 780 };
const PHONE_LANDSCAPE = { width: 780, height: 360 };

const DENSITIES = [
  { folder: 'mdpi', scale: 1 },
  { folder: 'hdpi', scale: 1.5 },
  { folder: 'xhdpi', scale: 2 },
  { folder: 'xxhdpi', scale: 3 },
  { folder: 'xxxhdpi', scale: 4 },
] as const;

export type AndroidFullBleedSplashProps = {
  backgroundColor: string;
  portraitImage: string;
  landscapeImage: string;
  tabletPortraitImage?: string;
  tabletLandscapeImage?: string;
};

function resolveProjectPath(projectRoot: string, assetPath: string): string {
  return path.join(projectRoot, assetPath.replace(/^\.\//, ''));
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function writeCoverPng(
  projectRoot: string,
  src: string,
  destDir: string,
  width: number,
  height: number,
): Promise<void> {
  await ensureDir(destDir);
  const { source } = await generateImageAsync(
    { projectRoot, cacheType: CACHE },
    { src: resolveProjectPath(projectRoot, src), width, height, resizeMode: 'cover' },
  );
  await fs.writeFile(path.join(destDir, IMAGE_FILE), source);
}

async function writeDensityBuckets(
  projectRoot: string,
  portraitSrc: string,
  landscapeSrc: string,
  resRoot: string,
): Promise<void> {
  await Promise.all(
    DENSITIES.flatMap(({ folder, scale }) => [
      writeCoverPng(
        projectRoot,
        portraitSrc,
        path.join(resRoot, `drawable-${folder}`),
        Math.round(PHONE_PORTRAIT.width * scale),
        Math.round(PHONE_PORTRAIT.height * scale),
      ),
      writeCoverPng(
        projectRoot,
        landscapeSrc,
        path.join(resRoot, `drawable-land-${folder}`),
        Math.round(PHONE_LANDSCAPE.width * scale),
        Math.round(PHONE_LANDSCAPE.height * scale),
      ),
    ]),
  );
}

const withAndroidFullBleedSplash: ConfigPlugin<AndroidFullBleedSplashProps> = (config, props) => {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const res = path.join(projectRoot, 'android/app/src/main/res');

      await writeDensityBuckets(projectRoot, props.portraitImage, props.landscapeImage, res);

      if (props.tabletPortraitImage) {
        await writeCoverPng(
          projectRoot,
          props.tabletPortraitImage,
          path.join(res, 'drawable-sw600dp-port-nodpi'),
          2048,
          2732,
        );
      }

      if (props.tabletLandscapeImage) {
        await writeCoverPng(
          projectRoot,
          props.tabletLandscapeImage,
          path.join(res, 'drawable-sw600dp-land-nodpi'),
          2732,
          2048,
        );
      }

      await ensureDir(path.join(res, 'drawable'));
      await fs.writeFile(
        path.join(res, 'drawable/splashscreen_full.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <bitmap android:gravity="fill" android:src="@drawable/splashscreen_full_image" />
  </item>
</layer-list>
`,
      );

      await ensureDir(path.join(res, 'drawable-nodpi'));
      await fs.writeFile(path.join(res, 'drawable-nodpi/splashscreen_icon_empty.png'), TRANSPARENT_PNG);

      return cfg;
    },
  ]);

  config = withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: 'splashscreen_background',
      value: props.backgroundColor,
    });
    return cfg;
  });

  config = withAndroidStyles(config, (cfg) => {
    let styles = cfg.modResults;
    styles = AndroidConfig.Styles.assignStylesValue(styles, {
      add: true,
      parent: SPLASH_STYLE,
      name: 'android:windowSplashScreenBackground',
      value: FULL_BLEED_DRAWABLE,
    });
    styles = AndroidConfig.Styles.assignStylesValue(styles, {
      add: true,
      parent: SPLASH_STYLE,
      name: 'android:windowSplashScreenAnimatedIcon',
      value: EMPTY_ICON_DRAWABLE,
    });
    styles = AndroidConfig.Styles.assignStylesValue(styles, {
      add: true,
      parent: SPLASH_STYLE,
      name: 'android:windowSplashScreenBehavior',
      value: 'background_preferred',
    });
    cfg.modResults = styles;
    return cfg;
  });

  return config;
};

export default withAndroidFullBleedSplash;
