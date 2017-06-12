var _ast, _interpreter;

function main() {
   document.getElementById("out").value = "";
   var input = document.getElementById("in").value;
   var tokens = lexer(input);
   var parser = new Parser(tokens);
   _ast = parser.parse();
   console.log(_ast);
}

function execute() {
   document.getElementById("out").value = "";
   _interpreter = new Interpreter(null);
   print(_ast.visit(_interpreter).value);
}

function log(msg) {
	document.getElementById("out").value += msg + "\n";
}

function Stream(str, trackPosition) {
	this.str = str;
   this.cursor = 0;
   this.saved_cursor = 0;
   //used for the source
   this.isPos = trackPosition;
   this.lineLengths = []; //used when we have to back up
   this.position = {
      row: 1,
      col: 1
   };
   this.saved_position = {
      row: 1,
      col: 1
   };
}

Stream.prototype.filterOut = function(filterFn) {
   for (var i = 0; i < this.str.length; i++) {
      if (filterFn(this.str[i])) {
         this.str.splice(i, 1);
         i--;
      }
   }
}

//return 1 char
Stream.prototype.next = function() {
	if (this.cursor >= this.str.length) {
      return "";
   }
   if (this.isPos) {
      
      if (this.str[this.cursor] === "\n") {
         this.lineLengths[this.position.row - 1] = (this.position.col - 1);
         this.position.row += 1;
         this.position.col = 1;
      } else {
         this.position.col += 1;
      }
   }
   return this.str[this.cursor++];
}

Stream.prototype.peek = function() {
   if (this.cursor >= this.str.length) {
      return "";
   }
   return this.str[this.cursor];
}

Stream.prototype.back = function() {
   //log("<backup>");
	this.cursor--;
   if (this.isPos) {
      this.position.col -= 1;
      if (this.str[this.cursor] === "\n") {
         this.position.row -= 1;
         this.position.col = this.lineLengths[this.position.row - 1];
      }
   }
}

Stream.prototype.save = function() {
   this.saved_cursor = this.cursor;
   this.saved_position.row = this.position.row;
   this.saved_position.col = this.position.col;
   return this.cursor;
}

Stream.prototype.restore = function() {
   this.cursor = this.saved_cursor;
   this.position.row = this.saved_position.row;
   this.position.col = this.saved_position.col;
}

Stream.prototype.getPosition = function () {
   return this.position;
}

Stream.prototype.charAt = function(index) {
   if (index < 0 || index >= this.str.length) {
      return "";
   }
   return this.str[index];
}

Stream.prototype.eof = function() {
   return this.cursor >= this.str.length;
}

const IDENTIFIER = "identifier";
const BINARY_OP = "binary op";
const UNARY_OP = "unary_op"; //either side
const KEYWORD = "keyword";
const STRING = "string";
const LINE_COMMENT = "line comment";
const BLOCK_COMMENT_OPEN = "block comment open";
const BLOCK_COMMENT_CLOSE = "block comment close";
const NUMBER = "number";
const LINE_END = "line end";
const COMMENT = "comment";
const BRACKET_OPEN = "bracket open";
const BRACKET_CLOSE = "bracket close";
const PUNCTUATOR = "punctuator";

//list all syntax strings (keywords, operators)
var TokenTypes = {
   //binary operators
   ".": BINARY_OP,
   ":": BINARY_OP,
   "+": BINARY_OP,
   "-": BINARY_OP,
	"*": BINARY_OP,
   "**": BINARY_OP,
   "/": BINARY_OP,
   "%": BINARY_OP,
   "=": BINARY_OP,
   "+=": BINARY_OP,
   "-=": BINARY_OP,
   "*=": BINARY_OP,
   "/=": BINARY_OP,
   "%=": BINARY_OP,
   "==": BINARY_OP,
   "===": BINARY_OP,
   "<": BINARY_OP,
   ">": BINARY_OP,
   "<=": BINARY_OP,
   ">=": BINARY_OP,
   "||": BINARY_OP,
   "&&": BINARY_OP,
   "<<": BINARY_OP,
   ">>": BINARY_OP,
   ">>>": BINARY_OP,
   "^": BINARY_OP,
   "|": BINARY_OP,
   "&": BINARY_OP,
   //unary operators
   "~": UNARY_OP,
   "!": UNARY_OP,
   "++": UNARY_OP,
   "--": UNARY_OP,
   //string indicators
   "\"": STRING,
   "\'": STRING,
   //comment indicators
   "\/\/": LINE_COMMENT,
   "/*": BLOCK_COMMENT_OPEN,
   "*/": BLOCK_COMMENT_CLOSE,
   //additional symbols
   ",": PUNCTUATOR,
   ";": PUNCTUATOR,
   "{": PUNCTUATOR,
   "}": PUNCTUATOR,
   "(": PUNCTUATOR,
   ")": PUNCTUATOR,
   //keywords
   "break": KEYWORD,
   "case": KEYWORD,
   "catch": KEYWORD,
   "class": KEYWORD,
   "const": KEYWORD,
   "continue": KEYWORD,
   "debugger": KEYWORD,
   "default": KEYWORD,
   "delete": KEYWORD,
   "do": KEYWORD,
   "else": KEYWORD,
   "export": KEYWORD,
   "extends": KEYWORD,
   "finally": KEYWORD,
   "for": KEYWORD,
   "function": KEYWORD,
   "if": KEYWORD,
   "import": KEYWORD,
   "in": KEYWORD,
   "instanceof": KEYWORD,
   "new": KEYWORD,
   "prototype": KEYWORD,
   "return": KEYWORD,
   "super": KEYWORD,
   "switch": KEYWORD,
   "this": KEYWORD,
   "throw": KEYWORD,
   "try": KEYWORD,
   "typeof": KEYWORD,
   "var": KEYWORD,
   "void": KEYWORD,
   "while": KEYWORD,
   "with": KEYWORD,
   "yield": KEYWORD,
   "true": KEYWORD,
   "false": KEYWORD,
   //types
   "boolean": KEYWORD,
   "char": KEYWORD,
   "double": KEYWORD,
   "int": KEYWORD
};

function isPrimitive(str) {
   return str === NUMBER || str === STRING || str === "boolean";
}

function LexerEntry(type, value, position) {
	this.type = type;
   this.value = value;
   this.position = {
      row: position.row,
      col: position.col - value.length
   };
}

function isDigit(c) {
   return /^[0-9]$/.test(c);
}

function isLetter(c) {
   return /^[a-zA-Z]$/.test(c);
}

function isWhitespace(c) {
   return c === "\s" || c === "\t" || c === "\n";
}

//some may be up to 3 digits, but we only need to verify the first character
function isArithmeticOperator(c) {
   var ops = ["+", "/", "*", "%", "=", "<", ">", "|", "&", "!", "^", "~",
      "(", ")", "{", "}", ";", "\"", ","];
   for (var i = 0; i < ops.length; i++) {
      if (ops[i] === c) {
         return true;
      }
   }
   return false;
}

//c is the starting point
function findTypedToken(srcStream) {
   var saveTok = "", token = "";
   var numMatches, match, c;
   var startPosition = srcStream.save(); //save index of first char in token
   srcStream.back();
   
   do {
      c = srcStream.next();
      console.log(">|"+c+"|");
      numMatches = 0;
      if (c === " ") {
         break;
      }
      token += c; //we might go from >1 matches to 0 matches ex. =1
      for (var key in TokenTypes) {
         if (key.substr(0, token.length) === token) {
            match = key;
            numMatches++;
         }
      }
      console.log(numMatches + ": " + token);
      if (numMatches > 0) {
         saveTok = token;
      }
      //alert(token);
   } while (numMatches > 1 || (numMatches === 1 && token.length < match.length));
   
   if (saveTok === "" && numMatches === 0) {
      console.log("dumped matches");
      srcStream.restore();
      return null;
   }
   
   if (saveTok !== "" && numMatches === 0) {
      console.log("Used saveTok: " + saveTok);
      srcStream.back(); //the last char messed up everything
      token = saveTok;
   }
   
   if (!(token in TokenTypes)) {
      srcStream.restore();
      return null;
   }
   
   //there was one match. Make sure the next character is not alphabetical (keywords only)
   //also check the leading character
   if (TokenTypes[token] === KEYWORD) {
      //check next
      var n = srcStream.next();
      console.log("checking if next is a letter: |" + n + "|");
      if (isLetter(n)) {
         console.log("not actually keyword (1): " + n);
         srcStream.restore();
         return null;
      }
      srcStream.back(); //so that the next char is not skipped
      //check previous
      n = srcStream.charAt(startPosition - 2);
      if (isLetter(n)) {
         console.log("not actually keyword (2): " + n);
         srcStream.restore();
         return null;
      }
   }
   
   //srcStream.back(); //to reverse checking next letter
   console.log("returned: " + token);
   return token;
}

function lexerString(srcStream, endChar) {
   var token = endChar; //in js, strings always end the way they start
   var c;
   
   
   while (!srcStream.eof()) {
      c = srcStream.next();
      if (c === "\\") {
         //escape next character
         continue;
      }
      token += c;
      if (c === endChar) {
         break;
      }
   }
   
   token = token.trim();
   if (token[0] !== token[token.length - 1]) {
      //open string
      log("Error: open string");
   }
   
   return token;
}

function lexerComment(srcStream, lineComment)
{
   var token = (lineComment ? "//" : "/*");
   var c;
   
   while (!srcStream.eof()) {
      c = srcStream.next();
      if (c === "\\") {
         //escape next character
         continue;
      }
      
      token += c;
      if (lineComment && c === "\n") {
         break;
      }
      if (!lineComment && c === "*") {
         if (srcStream.next() === "/") {
            token += "/";
            break;
         }
         srcStream.back();
      }
   }
   console.log("lexed comment: " + token);
   
   return token;
}

//a number can have . x b and other letters
//a number stops when you see an arithmetic operator (e-21 | e21), newline
function lexerNumber(srcStream) {
   var lastC, c, token = "";
   srcStream.back();
   
   lastC = "";
   while (!srcStream.eof()) {
      c = srcStream.next();
      
      console.log("c = " + c + " lastC = " + lastC);
      if (c === "-" && lastC !== "e") {
         srcStream.back(); // the last char ended our number
         break;
      }
      
      if (isArithmeticOperator(c)) {
         srcStream.back(); // the last char ended our number
         break; //does not check "-" (in case of 10e-21)
      }
      
      var n = srcStream.next();
      if (n !== "") {
         srcStream.back();
         if (c === "-" && n === "=") {
            srcStream.back(); // the last char ended our number
            break;
         }
      }
      
      if (c === "" || c === " " || c === "\t" || c === "\n") break;
      
      token += c;
      lastC = c;
      alert(c + "," + n + "," + token);
   }
   
   return token;
}

function addLexerEntry(srcStream, lexerStream, token, tokenIsNumber, tokenIsString,
   tokenIsLineComment, tokenIsBlockComment) {
   if (token in TokenTypes) {
      lexerStream.push(new LexerEntry(TokenTypes[token], token, 
         srcStream.getPosition()));
      log(TokenTypes[token] + " :: |" + token + "|");
   }
   else if (tokenIsNumber) {
      lexerStream.push(new LexerEntry(NUMBER, token, 
         srcStream.getPosition()));
      log("Number :: |" + token + "|");
   }
   else if (tokenIsString) {
      lexerStream.push(new LexerEntry(STRING, token, srcStream.getPosition()));
      log("String :: |" + token + "|");
   }
   else if (tokenIsBlockComment || tokenIsLineComment) {
      lexerStream.push(new LexerEntry(COMMENT, token, 
         srcStream.getPosition()));
      log("Comment :: |" + token + "|");
   }
   else {
      token = token.trim();
      if (token.length > 0) { 
         lexerStream.push(new LexerEntry(IDENTIFIER, token, 
            srcStream.getPosition()));
         log("Identifier :: |" + token + "|");
      }
   }
}

function lexer(src) {
	var srcStream = new Stream("{" + src + "};", true);
   var c, override, tmp;
   var lexerStream = [];
  
   var token = "";
   var tokenIsNumber = false; //parseFloat gets confused
   var tokenIsString = false;
   var tokenIsLineComment = false;
   var tokenIsBlockComment = false;
   
   override = false;
   while (!srcStream.eof() || override) {
      
      c = srcStream.next();
      console.log("|"+c+"|");
      //run one last time to finish up
      if (srcStream.eof() && token !== "") {
         override = true;
      }
      
      //check if c is numerical
      if (isDigit(c) && token === "") {
         token = lexerNumber(srcStream);
         tokenIsNumber = true;
         addLexerEntry(srcStream, lexerStream, token, tokenIsNumber,tokenIsString,
            tokenIsLineComment, tokenIsBlockComment);
         tokenIsNumber = false;
         token = "";
         continue;
      }
      
    
      //check if c is an operator
      tmp = findTypedToken(srcStream);
      if (tmp !== null) {
         //terminate the token and backup cursor
         if (token !== "") {
            //then finish our current token first
            console.log("finish token: " + token);
            addLexerEntry(srcStream, lexerStream, token, tokenIsNumber,tokenIsString,
               tokenIsLineComment, tokenIsBlockComment);
            tokenIsNumber = false;
            tokenIsString = false;
         }
         console.log("set token");
         token = tmp;
         if (TokenTypes[token] === STRING) {
            token = lexerString(srcStream, token);
            tokenIsString = true;
         }
         if (TokenTypes[token] === LINE_COMMENT) {
            token = lexerComment(srcStream, true);
            tokenIsLineComment = true;
         }
         if (TokenTypes[token] === BLOCK_COMMENT_OPEN) {
            token = lexerComment(srcStream, false);
            tokenIsBlockComment = true;
         }
         
         console.log("set token = tmp: " + tmp);
         addLexerEntry(srcStream, lexerStream, token, tokenIsNumber, tokenIsString,
            tokenIsLineComment, tokenIsBlockComment);
         token = "";
         override = false;
         tokenIsNumber = false;
         tokenIsString = false;
         tokenIsLineComment = false;
         tokenIsBlockComment = false;
         continue;
      } else {
         token += (c === " " ? "" : c);
      }
    
      if (!override) {
         if (c !== " " || token === "") {
            continue;
         }
      }
      
      addLexerEntry(srcStream, lexerStream, token, tokenIsNumber, tokenIsString,
         tokenIsLineComment, tokenIsBlockComment);
      token = "";
      override = false;
      tokenIsNumber = false;
      tokenIsString = false;
   }
   console.log(lexerStream);
   
   return lexerStream;
}