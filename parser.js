//loop control (and break is used in switch)
var BREAK = "break";
var CONTINUE = "continue";
var RETURN = "return";
var BASIC = "basic";

//all ast nodes must return a return object
function ReturnObj(type, value) {
   this.type = type;
   this.value = value;
}

class AST_Node {
   constructor (op) {
      this.op = op;
   }
   
   //override this
   visit(env) {
      return new ReturnObj(RETURN, undefined);
   }
}

class ProgramNode extends AST_Node {
	constructor (children) {
		super("PROGRAM");
      this.type = "ProgramNode";
		this.children = children;
	}
	
	addChild(node) {
		this.children.push(node);
	}
	
	visit(env) {
		//iterate through children right to left
      var result = new ReturnObj(RETURN, undefined);
		for (var i = 0; i < this.children.length; i++) {
			result = this.children[i].visit(env);
         if (result.type === RETURN || result.type === BREAK || result.type === CONTINUE) {
            break; //undefined for a break outside a loop/switch or a continue outside a loop
         }
		}
		return result;
	}
}

class BinaryOpNode extends AST_Node {
   constructor(op, left, right) {
      super(op);
      this.type = "BinaryOpNode";
      this.left = left;
      this.right = right;
   }
   
   visit(env) {
      
      //switch on arithmetic operators
      switch (this.op) {
         case "*":
            return new ReturnObj(BASIC, this.left.visit(env).value * this.right.visit(env).value);
         case "**":
            return new ReturnObj(BASIC, Math.pow(this.left.visit(env).value, this.right.visit(env).value));
         case "/":
            return new ReturnObj(BASIC, this.left.visit(env).value / this.right.visit(env).value);
         case "+":
            return new ReturnObj(BASIC, this.left.visit(env).value + this.right.visit(env).value);
         case "-":
            return new ReturnObj(BASIC, this.left.visit(env).value - this.right.visit(env).value);
         case "<":
            return new ReturnObj(BASIC, this.left.visit(env).value < this.right.visit(env).value);
         case "<=":
            return new ReturnObj(BASIC, this.left.visit(env).value <= this.right.visit(env).value);
         case ">":
            return new ReturnObj(BASIC, this.left.visit(env).value > this.right.visit(env).value);
         case ">=":
            return new ReturnObj(BASIC, this.left.visit(env).value >= this.right.visit(env).value);
         case "%":
            return new ReturnObj(BASIC, this.left.visit(env).value % this.right.visit(env).value);
         case "==":
            return new ReturnObj(BASIC, this.left.visit(env).value == this.right.visit(env).value);
         case "===":
            return new ReturnObj(BASIC, this.left.visit(env).value === this.right.visit(env).value);
         case "||":
            return new ReturnObj(BASIC, this.left.visit(env).value || this.right.visit(env).value);
         case "&&":
            return new ReturnObj(BASIC, this.left.visit(env).value && this.right.visit(env).value);
         case "|":
            return new ReturnObj(BASIC, this.left.visit(env).value | this.right.visit(env).value);
         case "&":
            return new ReturnObj(BASIC, this.left.visit(env).value & this.right.visit(env).value);
         case "<<":
            return new ReturnObj(BASIC, this.left.visit(env).value << this.right.visit(env).value);
         case ">>":
            return new ReturnObj(BASIC, this.left.visit(env).value >> this.right.visit(env).value);
         case ">>>":
            return new ReturnObj(BASIC, this.left.visit(env).value >>> this.right.visit(env).value);
         case "^":
            return new ReturnObj(BASIC, this.left.visit(env).value ^ this.right.visit(env).value);
      }
      
      //non-arithmetic operators
      if (this.op === "=") {
         if (this.left.type === "IdentifierNode") {
            env.setVar(this.left.op, this.right.visit(env).value);
         } else if (this.left.type === "BinaryOpNode" && this.left.op === ".") {
            if (this.left.right.type !== "IdentifierNode") {
               throw new Error("Object property must be identifier.");
            }
            this.left.left.visit(env).value[this.left.right.op] = this.right.visit(env).value;
         } else if (this.left.type === "ArrayIndexNode") {
            this.left.assign(env, this.right.visit(env).value);
         } else {
            throw new Error("Can only assign to identifiers, object properties, or an array index.");
         }
         return new ReturnObj(BASIC, this.left.visit(env).value);
      }
      
      if (this.op === "+=" || this.op === "-=" || this.op === "*=" || this.op === "/=" || this.op === "%=") {
         if (!(this.left.type !== "IdentifierNode")) {
            throw new Error("Cannot assign to non-identifier");
         }
         var value = env.getVar(this.left.op);
         switch (this.op) {
            case "+=":
               env.setVar(this.left.op, value + this.right.visit(env).value);
               break;
            case "-=":
               env.setVar(this.left.op, value - this.right.visit(env).value);
               break;
            case "*=":
               env.setVar(this.left.op, value * this.right.visit(env).value);
               break;
            case "/=":
               env.setVar(this.left.op, value / this.right.visit(env).value);
               break;
            case "%=":
               env.setVar(this.left.op, value % this.right.visit(env).value);
               break;
         }
         return new ReturnObj(BASIC, this.left.visit(env).value);
      }
      
      if (this.op === ".") {
         //access property right of object left
         return new ReturnObj(BASIC, this.right.visitObj(this.left.visit(env).value).value);
      }
      if (this.op === ":") {
         //creation of object
      }
      
      new ReturnObj(BASIC, undefined);
   }
}

class UnaryOpNode extends AST_Node {
   //left or right may be null, since some unary ops may swap (e.g. i++ or --i)
   constructor(op, left, right) {
      super(op);
      this.type = "UnaryOpNode";
      this.left = left;
      this.right = right;
   }
   
   visit(env) {
      var affected = this.left;
      var value;
      if (this.left === null) {
         affected = this.right;
      }
      
      if (this.op === "-") {
         return new ReturnObj(BASIC, -(affected.visit(env).value));
      }
      
      if (this.op === "++" || this.op === "--") {
         //for ++ and --, must next be an identifier
         if (!(affected.type === "IdentifierNode")) {
            throw new Error("Unable to increment/decrement non-identifier");
         }
         
         if (this.op === "++") {
            //pre-increment
            if (this.left === null) {
               value = env.getVar(this.right.op);
               env.setVar(this.right.op, value + 1);
               return new ReturnObj(BASIC, value + 1);
            }
            //post-increment
            if (this.right === null) {
               value = env.getVar(this.left.op);
               env.setVar(this.left.op, value + 1);
               return new ReturnObj(BASIC, value);
            }
         }
         if (this.op === "--") {
            //pre-increment
            if (this.left === null) {
               value = env.getVar(this.right.op);
               env.setVar(this.right.op, value - 1);
               return new ReturnObj(BASIC, value - 1);
            }
            //post-increment
            if (this.right === null) {
               value = env.getVar(this.left.op);
               env.setVar(this.left.op, value - 1);
               return new ReturnObj(BASIC, value);
            }
         }
      }
      
      
      return new ReturnObj(BASIC, affected.visit(env).value);
   }
}

class NumberNode extends AST_Node {
   //op is our value
   constructor(op) {
      super(op);
      this.type = "NumberNode";
      
      //now parse the number
      //base 10, 16 (0x...), or 2(0b)
      //also check for decimal
      var prefix = op.substr(0, 2);
      
      if (prefix === "0x") {
         this.op = parseInt(op, 16);
      } else if (prefix === "0b") {
         this.op = parseInt(op.substr(2), 2);
      } else {
         if (op.indexOf(".") !== -1) {
            this.op = parseFloat(op);
         } else {
            this.op = parseInt(op, 10);
         }
      }
   }
   
   visit(env) {
      return new ReturnObj(BASIC, this.op);
   }
}

class IdentifierDeclarationNode extends AST_Node {
   //op is our token from the lexer
   constructor(op, vars) {
      super(op);
      this.type = "IdentifierDeclarationNode";
      this.children = vars; //in case of var x = 0, y; var x = y = 2;
   }
   
   visit(env) {
      //start by declaring all the variables with null
      for (var i = 0; i < this.children.length; i++) {
         var temp = this.children[i];
         while (temp.type !== "IdentifierNode") {
            temp = temp.left; //assignments always happen on the left
         }
         env.defineVar(temp.op, null);
      }
      
      //iterate through children right to left
		for (var i = 0; i < this.children.length; i++) {
         this.children[i].visit(env);
      }
		return new ReturnObj(BASIC, undefined);
   }
}

class IdentifierNode extends AST_Node {
   //op is our token from the lexer
   constructor(op) {
      super(op);
      this.type = "IdentifierNode";
   }
   
   visit(env) {
      return new ReturnObj(BASIC, env.getVar(this.op));
   }
   
   visitObj(obj) {
      return new ReturnObj(BASIC, obj[this.op]);
   }
}

class StringNode extends AST_Node {
   //op is our token from the lexer
   constructor(op) {
      super(op);
      this.type = "StringNode";
      
      //trim off quotes
      this.op = this.op.substr(1);
      this.op = this.op.substr(0, this.op.length - 1);
   }
   
   visit(env) {
      return new ReturnObj(BASIC, this.op);
   }
}

class BooleanNode extends AST_Node {
   //op is our token from the lexer
   constructor(op) {
      super(op);
      this.type = "BooleanNode";
      this.value = (op === "true" ? true : false);
   }
   
   visit(env) {
      return new ReturnObj(BASIC, this.value);
   }
}

//for functions, there may be 0 - n return statements
//use a return node to exit

class ReturnNode extends AST_Node {
   constructor(value) {
      super("return");
      this.type = "ReturnNode";
      this.ast = value; //AST
   }
   
   visit(env) {
      return new ReturnObj(RETURN, this.ast.visit(env).value);
   }
}

class BreakNode extends AST_Node {
   constructor() {
      super("break");
      this.type = "BreakNode";
   }
   
   visit(env) {
      return new ReturnObj(BREAK, undefined);
   }
}

class ContinueNode extends AST_Node {
   constructor() {
      super("continue");
      this.type = "ContinueNode";
   }
   
   visit(env) {
      return new ReturnObj(CONTINUE, undefined);
   }
}

class UndefinedNode extends AST_Node {
   constructor() {
      super("undefined");
      this.type = "UndefinedNode";
   }
   
   visit(env) {
      return new ReturnObj(BASIC, undefined);
   }
}

class FunctionDeclarationNode extends AST_Node {
   //op is our token from the lexer
   constructor(isAnon, fname, ast, args) {
      super(fname);
      this.isAnon = isAnon; //is this an anonymous function?
      this.type = "FunctionDeclarationNode";
      this.ast = ast; //function body (ast)
      this.vars = []; //argument declarations (list of declarations)
      
      //cast arg list to actual variable definition nodes
      for (var i = 0; i < args.length; i++) {
         this.vars.push(new IdentifierNode(args[i]));
      }
      
      this.vars = new IdentifierDeclarationNode("var", this.vars);
   }
   
   addArgument(node) {
      this.vars.push(node);
   }
   
   addChild(node) {
		this.children.push(node);
	}
   
   visit(env) {
      if (!this.isAnon) {
         env.defineVar(this.op, this);
      }
      return new ReturnObj(BASIC, this);
   }
   
   execute(env, args) {
      var scope = env.extend();
      var result;
      
      //init scope with arguments
      this.vars.visit(scope);
      if (args.length != this.vars.children.length) {
         throw new Error("Improper # of arguments: expected " + this.vars.children.length + ", found " + args.length);
      }
      for (var i = 0; i < args.length; i++) {
         scope.setVar(this.vars.children[i].op, args[i]);
      }
      
      result = this.ast.visit(scope);
		if (result.type === BASIC) {
         var count = 0;
         var obj = scope.contextObj;
         for (var key in obj) {
            count++;
         }
         if (count > 0) {
            return new ReturnObj(BASIC, obj);
         }
         return new ReturnObj(BASIC, undefined);
      }
      return result;
	}
}

class FunctionCallNode extends AST_Node {
   //op is our token from the lexer
   constructor(fname, args) {
      super("call");
      this.type = "FunctionCallNode";
      this.value = fname; //function name
      this.vars = args; //arguments
   }
   
   addChild(node) {
      this.vars.push(node);
   }
   
   visit(env) {
      switch (this.value.op) {
         case "print":
            if (isPrimitive(this.vars[0].type)) {
               print(this.vars[0].op);
            } else {
               print(this.vars[0].visit(env).value);
            }
            return true;
      }
      
      //otherwise, lookup the function (like variable lookup) and visit the 
      //declaration node
      
      var fn = env.getVar(this.value.op);
      if (fn.type !== "FunctionDeclarationNode") {
         console.log(fn);
         throw new Error(this.value.op + " is not a function");
      }
      
      //get child values
      var args = [];
      for (var i = 0; i < this.vars.length; i++) {
         args.push(this.vars[i].visit(env).value);
      }
      
		return fn.execute(env, args);
	}
}

class IfElseNode extends AST_Node {
   constructor(cond, then, els) {
      super("if");
      this.type = "IfElseNode";
      this.cond = cond; //ast, must equal true
      this.then = then; //ast
      this.els = els; //ast
   }
   
   visit(env) {
      var result = new ReturnObj(BASIC, undefined);
      if (this.cond.visit(env).value) {
         result = this.then.visit(env);
      } else if (this.els) {
         result = this.els.visit(env);
      }
      return result;
   }
}

class SwitchNode extends AST_Node {
   constructor(switchValue, casesList, defaultCase, body) {
      super("switch");
      this.type = "SwitchNode";
      this.switchValue = switchValue;
      this.casesList = casesList; //key = case value, value = line number in body
      this.children = body;
      this.defaultCase = defaultCase; //line number in body, or -1 if no default
   }
   
   visit(env) {
      var key = this.switchValue.visit(env).value;
      var result = new ReturnObj(BASIC, undefined);
      var start = this.casesList[key];
      if (typeof start !== "undefined") {
         for (var i = start; i < this.children.length; i++) {
            result = this.children[i].visit(env);
            if (result.type === BREAK) {
               //switch swallows the break statement
               return new ReturnObj(BASIC, undefined);
            }
            if (result.type === RETURN) {
               //return must be swallowed at function scope
               return result;
            }
         }
      }
      
      if (this.defaultCase !== -1) {
         key = this.defaultCase;
         for (i = key; i < this.children.length; i++) {
            result = this.children[i].visit(env);
            if (result.type === BREAK) {
               //switch swallows the break statement
               return new ReturnObj(BASIC, undefined);
            }
            if (result.type === RETURN) {
               //return must be swallowed at function scope
               return result;
            }
         }
      }
      return new ReturnObj(BASIC, undefined);
   }
}

class LoopForNode extends AST_Node {
   constructor(init, cond, action, body) {
      super("for");
      this.type = "LoopForNode";
      this.init = init;
      this.cond = cond;
      this.action = action;
      this.body = body;
   }
   
   visit(env) {
      var result;
      
      this.init.visit(env);
      while (this.cond.visit(env).value) {
         var result = this.body.visit(env);
         //we don't explicitly handle continue here since the loop body (program node) already broke on continue
         if (result.type === BREAK) {
            break;
         }
         if (result.type === RETURN) {
            return result;
         }
         this.action.visit(env);
      }
      
      return new ReturnObj(BASIC, undefined);
   }
}

class LoopWhileNode extends AST_Node {
   constructor(cond, body) {
      super("while");
      this.cond = cond;
      this.body = body;
   }
   
   visit(env) {
      var result;
      
      while (this.cond.visit(env).value) {
         var result = this.body.visit(env);
         //we don't explicitly handle continue here since the loop body (program node) already broke on continue
         if (result.type === BREAK) {
            break;
         }
         if (result.type === RETURN) {
            return result;
         }
      }
      
      return new ReturnObj(BASIC, undefined);
   }
}

class LoopDoWhileNode extends AST_Node {
   constructor(cond, body) {
      super("while");
      this.cond = cond;
      this.body = body;
   }
   
   visit(env) {
      var result;
      
      do {
         var result = this.body.visit(env);
         //we don't explicitly handle continue here since the loop body (program node) already broke on continue
         if (result.type === BREAK) {
            break;
         }
         if (result.type === RETURN) {
            return result;
         }
      } while (this.cond.visit(env).value);
      
      return new ReturnObj(BASIC, undefined);
   }
}

class NewNode extends AST_Node {
   constructor(constructorFn) {
      super("new");
      this.constructorFn = constructorFn;
   }
   
   visit(env) {
      return this.constructorFn.visit(env); //js already creates a new object for us
   }
}

class ArrayIndexNode extends AST_Node {
   constructor(value, left) {
      super("array_index");
      this.value = value;
      this.left = left;
   }
   
   visit(env) {
      return this.left.visit(env).value[this.value.visit(env).value];
   }
   
   assign(env, value) {
      this.left.visit(env).value[this.value.visit(env).value] = value;
   }
}

const OP_PRECEDENCE = {
   "=": 1,
   "+=": 1,
   "-=": 1,
   "/=": 1,
   "*=": 1,
   "%=": 1,
   "||": 2,
   "&&": 3,
   "<": 4,
   ">": 4,
   "<=": 4,
   ">=": 4,
   "==": 4,
   "===": 4,
   "!=": 4,
   "!==": 4,
   "+": 5,
   "-": 5,
   "~": 5,
   "*": 6,
   "**": 6,
   "/": 6,
   "%": 6,
   "|": 6,
   "&": 6,
   "^": 6,
   ".": 7
};

class Parser {
   constructor (lexerArray) {
      this.lexerStream = new Stream(lexerArray, false);
      this.currentToken = null;
   }
   
   error(self, msg, position) {
      if (position !== null && !(typeof position === "undefined")) {
         throw new Error(msg + " at line " + position.row + " column " + position.col);
      } else {
         throw new Error(msg);
      }
   }
   
   skipTokenValue(self, expect) {
      if (self.lexerStream.peek().value === expect) {
         self.currentToken = self.lexerStream.next();
      } else {
         self.error(self, "Expected token: " + expect + ", found " + self.lexerStream.peek().value + " instead", self.currentToken.position);
      }
   }
   
   skipTokenType(self, expect) {
      if (self.lexerStream.peek().type === expect) {
         self.currentToken = self.lexerStream.next();
      } else {
         self.error(self, "Expected token type: " + expect, self.currentToken.position);
      }
   }
   
   parseVarName(self) {
      self.currentToken = self.lexerStream.next();
      var name = self.currentToken;
      if (name.type !== IDENTIFIER) {
         self.error(self, "Expected identifier", name.position);
      }
      return name.value;
   }
   
   //also handles else if
   parseIf(self) {
      self.skipTokenValue(self, "if");
      var then, els, condition;
      
      condition = self.parseExpression(self);
      if (self.lexerStream.peek().value !== "{") {
         //then only parse the next expression
         then = self.parseExpression(self);
      } else {
         then = self.parseProgram(self);
      }
      els = null;
      if (self.lexerStream.peek().value === "else") {
         self.currentToken = self.lexerStream.next();
         if (self.lexerStream.peek().value !== "{") {
            els = self.parseExpression(self);
         } else {
            els = self.parseProgram(self);
         }
      }
      return new IfElseNode(condition, then, els);
   }
   
   parseBinaryOp(self, left, precedence) {
      var token = self.lexerStream.peek();
      if (token.type === BINARY_OP || token.type === UNARY_OP) {
         var tokenPrecedence = OP_PRECEDENCE[token.value];
         //if the next operator has higher precedence than us, do them first
         if (tokenPrecedence > precedence) {
            self.currentToken = self.lexerStream.next();
            return self.parseBinaryOp(self, new BinaryOpNode(token.value, left, 
               self.parseBinaryOp(self, self.parseStatement(self), tokenPrecedence)), 
               precedence);
         }
      }
      return left;
   }
   
   parseFunctionCall(self, fnName) {
      return new FunctionCallNode(fnName, self.parseDelimited(self, "(", ")", ",", 
         [1, 1, 1], self.parseExpression));
   }
   
   parseFunctionCallDeclaration(self, fnName) {
      var args = self.parseDelimited(self, "(", ")", ",", [1, 1, 1], self.parseVarName);
      var body = self.parseExpression(self);
      console.log("parsed function dec: " + fnName);
      return new FunctionDeclarationNode(false, fnName, body, args);
   }
   
   parseAnonymousFunctionCall(self) {
      var args = self.parseDelimited(self, "(", ")", ",", [1, 1, 1], self.parseVarName);
      var body = self.parseExpression(self);
      return new FunctionDeclarationNode(true, "", body, args);
   }
   
   parseIfFunctionCall(self, exprFn) {
      var expr = exprFn(self);
      return self.lexerStream.peek().value === "(" ? self.parseFunctionCall(self, expr) : expr;
   }
   
   parseSwitch(self) {
      /*
      switch(x) {
         case 1:
         case 2:
            x = 2;
            break;
         default:
      }
      */
      var value = self.parseStatement(self);
      var caseLabels = {};
      var defaultCase = -1;
      var body = [];
      var next;
      
      self.skipTokenValue(self, "{");
      while (self.currentToken.value !== "}") {
         next = self.lexerStream.peek();
         if (next.value === "}") {
            self.skipTokenValue(self, "}");
            break;
         }
         
         if (next.value === "case") {
            self.skipTokenValue(self, "case");
            self.currentToken = self.lexerStream.next();
            next = self.currentToken;
            if (next.value === "true" || next.value === "false") {
               self.skipTokenValue(self, ":");
               caseLabels[new BooleanNode(next.value).value] = body.length;
            } else if (next.type === NUMBER) {
               //self.skipTokenValue(self, ":");
               caseLabels[new NumberNode(next.value).op] = body.length;
            } else if (next.type === STRING) {
               self.skipTokenValue(self, ":");
               caseLabels[new StringNode(next.value).op] = body.length;
            } else {
               throw new self.error(self, "Switch case must be static.", self.currentToken.position);
            }
         } else if (next.value === "default") {
            self.skipTokenValue(self, "default");
            self.skipTokenValue(self, ":");
            defaultCase = body.length;
         } else {
            body.push(self.parseExpression(self));
            self.skipTokenValue(self, ";");
         }
      }
      
      return new SwitchNode(value, caseLabels, defaultCase, body);
   }
   
   parseForLoop(self) {
      var args = self.parseDelimited(self, "(", ")", ";", [1, 1, 1], self.parseExpression);
      var body = self.parseProgram(self);
      return new LoopForNode(args[0], args[1], args[2], body);
   }
   
   parseWhileLoop(self, isDoWhile) {
      var body, cond;
      if (isDoWhile) {
         body = self.parseProgram(self);
         self.skipTokenValue(self, "while");
         cond = self.parseExpression(self);
         return new LoopDoWhileNode(cond, body);
      }
      cond = self.parseExpression(self);
      body = self.parseProgram(self);
      return new LoopWhileNode(cond, body);
   }
   
   parseStatement(self) {
      return self.parseIfFunctionCall(self, function (self) {
         var expr, next = self.lexerStream.peek().value;
         if (next === "(") {
            self.skipTokenValue(self, "(");
            expr = self.parseExpression(self);
            self.skipTokenValue(self, ")");
            return expr;
         }
         if (next === "{") {
            return self.parseProgram(self);
         }
         if (next === "if") {
            return self.parseIf(self);
         }
         if (next === "function") {
            self.currentToken = self.lexerStream.next(); //consume "function"
            if (self.lexerStream.peek().type === IDENTIFIER) {
               self.currentToken = self.lexerStream.next(); //consume varname
               return self.parseFunctionCallDeclaration(self, self.currentToken.value);
            } else {
               return self.parseAnonymousFunctionCall(self);
            }
         }
         if (next === "return") {
            self.currentToken = self.lexerStream.next(); //consume "return"
            expr = self.parseExpression(self);
            return new ReturnNode(expr);
         }
         if (next === "var") {
            expr = self.parseDelimited(self, "var", ";", ",", [1, 0, 1], self.parseExpression);
            return new IdentifierDeclarationNode("var", expr);
         }
         if (next === "switch") {
            self.currentToken = self.lexerStream.next(); //consume "switch"
            return self.parseSwitch(self);
         }
         if (next === "break") {
            self.currentToken = self.lexerStream.next(); //consume "break"
            return new BreakNode();
         }
         if (next === "continue") {
            self.currentToken = self.lexerStream.next(); //consume "continue"
            return new ContinueNode();
         }
         if (next === "for") {
            self.currentToken = self.lexerStream.next(); //consume "for"
            return self.parseForLoop(self);
         }
         if (next === "while") {
            self.currentToken = self.lexerStream.next(); //consume "for"
            return self.parseWhileLoop(self, false);
         }
         if (next === "do") {
            self.currentToken = self.lexerStream.next(); //consume "for"
            return self.parseWhileLoop(self, true);
         }
         if (next === "new") {
            self.currentToken = self.lexerStream.next(); //consume "next"
            return new NewNode(self.parseStatement(self));
         }
         
         self.currentToken = self.lexerStream.next();
         var token = self.currentToken;
         
         if (token.type === IDENTIFIER || token.value === "this") {
            if (self.lexerStream.peek().type === UNARY_OP) {
               //then we are dealing with x++ or x--
               self.currentToken = self.lexerStream.next();
               var nextToken = self.currentToken;
               return new UnaryOpNode(nextToken.value, new IdentifierNode(token.value), null);
            }
            return new IdentifierNode(token.value);
         }
         if (token.type === NUMBER) {
            return new NumberNode(token.value);
         }
         if (token.type === STRING) {
            return new StringNode(token.value);
         }
         if (next === "true" || next === "false") {
            return new BooleanNode(next);
         }
         if (next === "-" || token.type === UNARY_OP) {
            //then minus is functioning as a unary op here
            expr = self.parseExpression(self);
            return new UnaryOpNode(token.value, null, expr);
         }
         self.error(self, "Unexpected token: " + JSON.stringify(token), token.position);
      });
   }
   
   parseDelimited(self, start, stop, delim, consume, parserFn) {
      var list = [];
      var first = true;
      
      self.skipTokenValue(self, start);
      while (!self.lexerStream.eof()) {
         if (self.lexerStream.peek().value === stop) break;
         if (first) {
            first = false;
         } else {
            
            //relax the semi-colon rules
            if (!(self.currentToken.value === "}" && self.lexerStream.peek().value !== ";")) {
               self.skipTokenValue(self, delim);
            }
         }
         if (self.lexerStream.peek().value === stop) break;
         list.push(parserFn(self));
      }
      
      //0 - start
      //1 - stop
      //2 - delim
      if (consume[1]) {
         self.skipTokenValue(self, stop);
      }
      return list;
   }
   
   parseExpression(self) {
      //maybe the expression is a function call
      //if not, maybe it is binary
      //if not, it should just be a statement
      
      return self.parseIfFunctionCall(self, function (self) {
         return self.parseBinaryOp(self, self.parseStatement(self), 0);
      });
   }
   
   parseProgram(self) {
      var program = self.parseDelimited(self, "{", "}", ";", [1, 1, 1], self.parseExpression);
      
      return new ProgramNode(program);
   }
   
   parseRoot(self) {
      //remove all comments first
      self.lexerStream.filterOut(function (item) {
         return (item.type === "comment");
      });
      
      return self.parseProgram(self);
   }
   
   parse() {
      return this.parseRoot(this);
   }
}