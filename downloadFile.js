const p = require("phin");
const fs = require("fs");

function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        p({
            url,
            stream: true,
        }).then(res => {
            const contentLength = Number(res.headers["content-length"]);
            let bytesWritten = 0;

            const writeStream = fs.createWriteStream(dest);

            res.stream.on("data", chunk => {
                bytesWritten += chunk.length;
                onProgress(bytesWritten, contentLength);
            });
            res.stream.on("end", resolve);

            res.stream.pipe(writeStream);
        });
    });
}

if (require.main === module) {
    (async () => {
        console.log("Download start")
        await downloadFile("http://www.example.com/index.html", "index.html", (bytesWritten, contentLength) => {
            console.log({ bytesWritten, contentLength });
        });
        console.log("Download end")
    })();
}

module.exports = downloadFile;
