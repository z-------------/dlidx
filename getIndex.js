const url = require("url");
const p = require("phin");
const DomParser = require("dom-parser");

const parser = new DomParser();

async function getIndex(indexUrl) {
    const res = await p(indexUrl);
    const body = res.body.toString();
    const dom = parser.parseFromString(body);

    const files = [];
    const linkElems = dom.getElementsByTagName("a");
    for (const elem of linkElems) {
        files.push({
            name: elem.firstChild.textContent,
            url: new URL(elem.getAttribute("href"), indexUrl).href,
        });
    }
    return files;
}

if (require.main === module) {
    (async () => {
        await getIndex("http://localhost:8000/");
    })();
}

module.exports = getIndex;
