const fs = require('fs');
const path = require('path');

// Paths
const appJsonPath = path.resolve(__dirname, '../app.json');
const infoPlistPath = path.resolve(__dirname, '../ios/AppBothside/Info.plist');
const projectPbxPath = path.resolve(__dirname, '../ios/AppBothside.xcodeproj/project.pbxproj');

// Read app.json
const appJson = require(appJsonPath);
const version = appJson.expo.version;
const buildNumber = appJson.expo.ios.buildNumber;

console.log(`Syncing version: ${version} (Build: ${buildNumber})`);

// 1. Update Info.plist
let infoPlist = fs.readFileSync(infoPlistPath, 'utf8');

// Update CFBundleShortVersionString
infoPlist = infoPlist.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${version}$2`
);

// Update CFBundleVersion
infoPlist = infoPlist.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${buildNumber}$2`
);

fs.writeFileSync(infoPlistPath, infoPlist);
console.log('✅ Updated Info.plist');

// 2. Update project.pbxproj
let projectPbx = fs.readFileSync(projectPbxPath, 'utf8');

// Update MARKETING_VERSION (using global replace just in case, though usually one per config)
projectPbx = projectPbx.replace(
    /(MARKETING_VERSION = )[\d.]+;/g,
    `$1${version};`
);

// Update CURRENT_PROJECT_VERSION
projectPbx = projectPbx.replace(
    /(CURRENT_PROJECT_VERSION = )[\d]+;/g,
    `$1${buildNumber};`
);

fs.writeFileSync(projectPbxPath, projectPbx);
console.log('✅ Updated project.pbxproj');

console.log('🎉 Version sync complete!');
