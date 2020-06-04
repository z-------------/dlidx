#!/usr/bin/env node

const blessed = require("blessed");
const path = require("path");

const getIndex = require("./getIndex");
const downloadFile = require("./downloadFile");
const { die } = require("./util");

const indexName = process.argv[2];
if (!indexName) die("No index URL given.");
const indexUrl = (indexName.startsWith("http://") || indexName.startsWith("https://")) ? indexName : "http://" + indexName;

function makeFileItem(indexPlaces, idx, filename) {
    return `[${idx.toString().padStart(indexPlaces)}] ${filename}`;
}

function showFiles(list, files, filter = "") {
    list.clearItems();

    const indexPlaces = Math.floor(Math.log10(files.length)) + 1;
    for (let i = 0; i < files.length; ++i) {
        const file = files[i];
        if (!file.name.toLowerCase().includes(filter.toLowerCase())) continue;
        list.addItem(makeFileItem(indexPlaces, i, file.name));
    }
    screen.render();
}

/**
 * Shows a progress modal. Pass `null` into `filename` to hide the modal.
 * @param {string | null} filename
 * @param {number} currentBytes
 * @param {number} totalBytes
 */
const progressModal = (function() {
    let modal, progressBar, progressText;

    return function(filename, currentBytes, totalBytes) {
        if (filename === null && modal) {
            screen.remove(modal);
            modal = null;
        } else {
            if (!modal) {
                modal = blessed.box({
                    top: "center",
                    left: "center",
                    width: "40%",
                    height: 5 + 2,
                    tags: true,
                    border: {
                        type: "line",
                        fg: "#f0f0f0"
                    },
                    style: {
                        fg: "white",
                        bg: "black",
                    },
                });

                modal.append(blessed.text({
                    left: "center",
                    width: "100%-3",
                    content: `Downloading:\n'${filename}'...`,
                }));

                progressText = blessed.text({
                    left: 1,
                    top: 3,
                });
                modal.append(progressText);

                progressBar = blessed.progressbar({
                    height: 1,
                    left: 1,
                    width: "100%-4",
                    bottom: 0,
                    orientation: "horizontal",
                    style: {
                        bg: "#333333",
                        bar: {
                            bg: "white",
                        },
                    },
                });
                modal.append(progressBar);

                screen.append(modal);
            }

            let progress = currentBytes / (totalBytes || 1) * 100;
            progressBar.setProgress(progress);

            progressText.setContent(`${currentBytes} / ${totalBytes} B (${Math.floor(progress)}%)`);
        }
        screen.render();

        return modal;
    }
})();

const screen = blessed.screen({ smartCSR: true });
screen.title = `Index of ${indexName}`;

// const marked = []; // array of indexes

(async () => {
    /* prepare the top bar */

    const titleText = blessed.text({
        left: 1,
        content: `Index of ${indexName}`,
    });
    screen.append(titleText);

    /* prepare the list */

    const listBox = blessed.box({
        top: 1,
        bottom: 1,
        border: { type: "line" },
        style: {
            fg: "white",
            border: {
                fg: "#f0f0f0",
            },
        },
    });

    const list = blessed.list({
        keys: true,
        style: {
            selected: {
                bg: "blue",
                bold: true,
            },
        },
    });
    const files = await getIndex(indexUrl);
    showFiles(list, files);
    listBox.append(list);
    list.focus();

    list.on("keypress", (ch, key) => {
        if (ch === "g") list.select(0);
        if (ch === "G") list.select(files.length - 1);
        screen.render();
    });

    list.on("select", node => {
        if (!node) return;
        const idx = parseInt(node.content.split("]")[0].substring(1));
        const file = files[idx];
        progressModal(file.name, 0, 0);
        downloadFile(file.url, path.join(process.cwd(), file.name), (bytesWritten, contentLength) => {
            progressModal(file.name, bytesWritten, contentLength);
        }).then(() => {
            progressModal(null);
        });
    });

    screen.append(listBox);

    /* prepare the bottom bar */

    const bottomBar = blessed.box({
        bottom: 0,
        height: 1,
        width: "100%",
        tags: true,
        style: {
            bg: "#999900"
        },
    });

    const filterLabel = blessed.text({
        top: 0,
        left: 1,
        content: "Filter (/): ",
        style: {
            fg: "black",
            bg: "#999900",
        },
    });
    bottomBar.append(filterLabel);

    const filterInput = blessed.textbox({
        left: 1 + 12,
        width: "100%-12",
        style: {
            fg: "black",
            bg: "#cccc00",
        },
    });
    bottomBar.append(filterInput);

    screen.key(["/"], () => {
        filterInput.focus();
        filterInput.readInput((err, value) => {
            if (value === null || value.length === 0) {
                showFiles(list, files);
            } else {
                showFiles(list, files, value);
            }
            list.focus();
        });
    });
    screen.key(["escape"], () => {
        filterInput.setValue("");
        showFiles(list, files);
    });

    screen.append(bottomBar);

    /* get ready to display */

    screen.key(["q", "C-c"], (ch, key) => {
        return process.exit(0);
    });

    screen.render();
})();
