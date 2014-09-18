#!/bin/bash
set -e
COUNTER=0
while [  $COUNTER -lt 100 ]; do
    echo The counter is $COUNTER
    npm test
    # rm -rf .cache/ static/ && mocha test/optimizer-test.js
    let COUNTER=COUNTER+1
done
