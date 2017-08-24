var DEFAULT_TIMEOUT = process.env.LASSO_TIMEOUT;

if (DEFAULT_TIMEOUT) {
    DEFAULT_TIMEOUT = parseInt(DEFAULT_TIMEOUT, 10);
} else {
    DEFAULT_TIMEOUT = 30000; /* 30s */
}

function getDefaultTimeout() {
    return DEFAULT_TIMEOUT;
}

exports.getDefaultTimeout = getDefaultTimeout;
