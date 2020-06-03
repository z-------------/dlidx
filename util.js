function die(message, status = 1) {
    console.error(message);
    return process.exit(status);
}

module.exports = { die };
