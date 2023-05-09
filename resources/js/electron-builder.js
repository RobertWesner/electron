const {copySync, removeSync} = require("fs-extra");
const {join} = require("path");
const {execSync} = require("child_process");
const isBuilding = process.env.NATIVEPHP_BUILDING == 1;
const appName = process.env.NATIVEPHP_APP_NAME;
const fileName = process.env.NATIVEPHP_APP_FILENAME;
const appVersion = process.env.NATIVEPHP_APP_VERSION;
const appUrl = process.env.APP_URL;
const isArm64 = process.argv.includes('--arm64');
const phpBinary = process.env.NATIVEPHP_PHP_BINARY;

copySync(join(__dirname, '..', '..', 'bin', (isArm64 ? 'arm64' : 'x86'), 'php'), join(__dirname, 'resources', 'php'));

if (isBuilding) {
    console.log('=====================');
    if (isArm64) {
        console.log('Building for ARM64');
        console.log(join(__dirname, '..', '..', 'bin', (isArm64 ? 'arm64' : 'x86'), 'php'));
    } else {
        console.log('Building for x86');
        console.log(join(__dirname, '..', '..', 'bin', (isArm64 ? 'arm64' : 'x86'), 'php'));
    }
    console.log('=====================');

    try {
        removeSync(join(__dirname, 'resources', 'app'));
        removeSync(join(__dirname, 'resources', 'php'));

        copySync(join(__dirname, '..', '..', 'bin', (isArm64 ? 'arm64' : 'x86'), 'php'), join(__dirname, 'resources', 'php'));

        copySync(process.env.APP_PATH, join(__dirname, 'resources', 'app'), {
            overwrite: true,
            dereference: true,
            filter: (src, dest) => {
                let skip = [
                    // Only needed for local testing
                    join(process.env.APP_PATH, 'vendor', 'nativephp', 'electron', 'vendor'),
                    join(process.env.APP_PATH, 'vendor', 'nativephp', 'laravel', 'vendor'),

                    join(process.env.APP_PATH, 'vendor', 'nativephp', 'electron', 'bin'),
                    join(process.env.APP_PATH, 'vendor', 'nativephp', 'electron', 'resources'),
                    join(process.env.APP_PATH, 'node_modules'),
                    join(process.env.APP_PATH, 'dist'),
                ];

                let shouldSkip = false;
                skip.forEach((path) => {
                    if (src.indexOf(path) === 0) {
                        shouldSkip = true;
                    }
                });

                return !shouldSkip;
            }
        });
        console.log('=====================');
        console.log('Copied app to resources');
        console.log(join(process.env.APP_PATH, 'dist'));
        console.log('=====================');

        execSync(`${phpBinary} ${join(__dirname, 'resources', 'app', 'artisan')} native:minify ${join(__dirname, 'resources', 'app')}`);
    } catch (e) {
        console.log('=====================');
        console.log('Error copying app to resources');
        console.log(e);
        console.log('=====================');
    }

}

const deepLinkProtocol = 'nativephp';

module.exports = {
    appId: 'com.electron.app',
    productName: appName,
    directories: {
        buildResources: 'build',
        output: isBuilding ? join(process.env.APP_PATH, 'dist') : undefined,
    },
    files: [
        '!**/.vscode/*',
        '!src/*',
        '!electron.vite.config.{js,ts,mjs,cjs}',
        '!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
        '!{.env,.env.*,.npmrc,pnpm-lock.yaml}',
    ],
    asarUnpack: [
        'resources/**',
    ],
    afterSign: 'build/notarize.js',
    win: {
        executableName: fileName,
    },
    nsis: {
        artifactName: appName + '-${version}-setup.${ext}',
        shortcutName: '${productName}',
        uninstallDisplayName: '${productName}',
        createDesktopShortcut: 'always',
    },
    protocols: {
        name: deepLinkProtocol,
        schemes: [deepLinkProtocol],
    },
    mac: {
        entitlementsInherit: 'build/entitlements.mac.plist',
        target: {
            target: 'default',
            arch: ['x64', 'arm64'],
        },
        artifactName: appName + '-${version}-${arch}.${ext}',
        extendInfo: {
            NSCameraUsageDescription:
                "Application requests access to the device's camera.",
            NSMicrophoneUsageDescription:
                "Application requests access to the device's microphone.",
            NSDocumentsFolderUsageDescription:
                "Application requests access to the user's Documents folder.",
            NSDownloadsFolderUsageDescription:
                "Application requests access to the user's Downloads folder.",
        },
    },
    dmg: {
        artifactName: appName + '-${version}-${arch}.${ext}',
    },
    linux: {
        target: ['AppImage', 'snap', 'deb'],
        maintainer: 'electronjs.org',
        category: 'Utility',
    },
    appImage: {
        artifactName: appName + '-${version}.${ext}',
    },
    npmRebuild: false,
    publish: {
        provider: 'generic',
        url: 'https://example.com/auto-updates',
    },
    extraMetadata: {
        name: fileName,
        homepage: appUrl,
        version: appVersion
    }
};
