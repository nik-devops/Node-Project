ReferenceError: TextEncoder is not defined   --- > If this error occur then 

GOTO : 

node_modules/whatwg-url/lib/encoding.js

Add this line on top -->  const { TextEncoder, TextDecoder } = require("util");


