const baseUrl = "https://static.ankama.com/wakfu/portal/game/item/64/";

const fs = require("fs");
const jsonItemData = fs.readFileSync("items.json", "utf8");
const itemData = JSON.parse(jsonItemData);

const getItemImages = async () => {
  for (itemIndex in itemData) {
    let itemGfxId = itemData[itemIndex].definition.item.graphicParameters.gfxId;
    let targetImageUrl = baseUrl + itemGfxId + ".png";
    let targetFilePath = "../../items/" + itemGfxId + ".png";

    let fileExists = await fs.existsSync(targetFilePath);
    if (fileExists) {
      continue;
    }

    console.log(targetFilePath);

    let response = await fetch(targetImageUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "if-modified-since": "Tue, 12 Dec 2023 13:50:31 GMT",
        "if-none-match": '"bd47802bb14ce1515008c35b4ac06757"',
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "cross-site",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      referrer: "https://www.wakfu.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    });

    let imageBlob = await response.blob();

    var buffer = await imageBlob.arrayBuffer();
    buffer = Buffer.from(buffer);
    fs.createWriteStream(targetFilePath).write(buffer);

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
};

getItemImages();
