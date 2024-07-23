const fs = require('fs');

const jsonFileNames = [
  'actions',
  'blueprints',
  'collectibleResources',
  'equipmentItemTypes',
  'harvestLoots',
  'itemProperties',
  'items',
  'itemTypes',
  'jobsItems',
  'recipeCategories',
  'recipeIngredients',
  'recipeResults',
  'recipies',
  'resources',
  'resourceTypes',
  'states'
];

// https://wakfu.cdn.ankama.com/gamedata/config.json
// https://wakfu.cdn.ankama.com/gamedata/(version)/(type).json

const jsonVersion = '1.84.1.25';

const checkCurrentVersion = async () => {
  let versionUrl = 'https://wakfu.cdn.ankama.com/gamedata/config.json'
  let response = await fetch(versionUrl);
  let responseJson = await response.text();
  let json = JSON.parse(responseJson)

  if(json.version !== jsonVersion) {
    console.log('new version needed', json.version, '. Update and run this again.')
    return true;
  } else {
    console.log('we have the current version')
    return false;
  }
}

const getJsonData = async () => {
  for (let index in jsonFileNames) {
    let jsonName = jsonFileNames[index];
    let targetDirectory = 'json/';

    let jsonUrl = `https://wakfu.cdn.ankama.com/gamedata/${jsonVersion}/${jsonName}.json`
    let targetFilePath = targetDirectory + jsonName + '.json';

    let fileExists = await fs.existsSync(targetFilePath);
    if(process.argv.includes('skip-existing') && fileExists) {
      continue;
    }

    let response = await fetch(jsonUrl);
    let htmlText = await response.text();

    await fs.writeFile(targetFilePath, htmlText, () => {});
    console.log('wrote', targetFilePath)

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

checkCurrentVersion();
getJsonData();